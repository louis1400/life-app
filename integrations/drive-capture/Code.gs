// Deploy as a web app: execute as Me, access Only myself.
const ARCHIVE_ROOT = '1KpUo5LW2kAFgbLCeDcNW1PvK2aS_TCwj';
const ARCHIVE_OWNER = 'louisnijholt@gmail.com';

function owner_() {
  if (Session.getActiveUser().getEmail().toLowerCase() !== ARCHIVE_OWNER) {
    throw new Error('Open this page while signed in to your archive Google account.');
  }
}

function folders_() {
  const iterator = DriveApp.getFolderById(ARCHIVE_ROOT).getFolders();
  const folders = [];
  while (iterator.hasNext()) {
    const folder = iterator.next();
    if (!folder.isTrashed()) folders.push({ id: folder.getId(), name: folder.getName() });
  }
  return folders.sort((a, b) => a.name.localeCompare(b.name));
}

function parseLink_(value) {
  const url = String(value || '').trim();
  if (url.length > 8192 || /[\s<>"\u0000-\u001f]/.test(url)) throw new Error('Enter one complete web link.');
  const match = /^https?:\/\/([a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)(?::\d{1,5})?(?:[/?#].*)?$/i.exec(url);
  if (!match) throw new Error('Use a link beginning with https:// or http://.');
  return { url: url, host: match[1].toLowerCase().replace(/^www\./, '') };
}

function suggest_(url, folders) {
  let name = 'Inbox';
  try {
    const host = parseLink_(url).host;
    if (/^(youtube\.com|m\.youtube\.com|youtu\.be|tiktok\.com|vm\.tiktok\.com|vimeo\.com)$/.test(host)) name = 'Videos';
    // Mixed-media social posts remain undecided: a URL alone doesn't tell us its format.
    else if (!/(^|\.)(instagram\.com|facebook\.com|fb\.watch|x\.com|twitter\.com|reddit\.com|redd\.it|threads\.net|threads\.com)$/.test(host)) name = 'Articles & links';
  } catch (_) { /* A blank form can still be opened and filled in. */ }
  return (folders.find(f => f.name === name) || folders.find(f => f.name === 'Inbox') || folders[0] || {}).id || '';
}

function doGet(event) {
  owner_();
  const template = HtmlService.createTemplateFromFile('Capture');
  template.sharedUrl = String(event && event.parameter && event.parameter.url || '').slice(0, 8192);
  template.folders = folders_();
  template.suggested = suggest_(template.sharedUrl, template.folders);
  return template.evaluate().setTitle('Save to Archive').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function saveBookmark(input) {
  owner_();
  if (!input || typeof input !== 'object') throw new Error('Nothing to save.');
  const link = parseLink_(input.url);
  const folder = folders_().find(f => f.id === input.folderId);
  if (!folder) throw new Error('Choose a folder inside Internet Archive.');
  const title = String(input.title || '').trim().slice(0, 200) || link.host;
  const tags = [...new Set(String(input.tags || '').split(',').map(t => t.trim()).filter(Boolean))];
  if (tags.length > 30 || tags.some(t => t.length > 80)) throw new Error('Use up to 30 tags, each at most 80 characters.');
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, link.url, Utilities.Charset.UTF_8)
    .map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
  const marker = '\nArchive link ID: ' + digest;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('Another save is finishing. Please try again.');
  try {
    const destination = DriveApp.getFolderById(folder.id);
    const existing = destination.getFiles();
    while (existing.hasNext()) {
      const file = existing.next();
      if (!file.isTrashed() && String(file.getDescription()).endsWith(marker)) {
        return { duplicate: true, folder: folder.name, fileUrl: file.getUrl() };
      }
    }
    const content = [title, '', link.url, '', 'Tags: ' + tags.join(', '),
      'Saved: ' + new Date().toISOString(), 'Capture: link only', ''].join('\n');
    const safeTitle = title.replace(/[\u0000-\u001f/\\]/g, ' ').trim() || link.host;
    const file = destination.createFile(safeTitle + ' - ' + digest.slice(0, 12) + '.txt', content, MimeType.PLAIN_TEXT);
    try {
      file.setDescription('Saved link: ' + link.url + '\nTags: ' + tags.join(', ') + marker);
    } catch (error) {
      file.setTrashed(true);
      throw error;
    }
    return { duplicate: false, folder: folder.name, fileUrl: file.getUrl() };
  } finally { lock.releaseLock(); }
}

// Metadata export only. Original files and folder choices are never changed.
function exportVaultCaptures() {
  owner_();
  const records = [];
  for (const folder of folders_()) {
    const files = DriveApp.getFolderById(folder.id).getFiles();
    while (files.hasNext()) {
      const file = files.next();
      if (file.isTrashed() || file.getMimeType() !== MimeType.PLAIN_TEXT || file.getSize() > 100000 || !/\nArchive link ID: [a-f0-9]{64}$/.test(file.getDescription())) continue;
      const lines = file.getBlob().getDataAsString().split(/\r?\n/);
      const link = lines[2];
      try { parseLink_(link); } catch (_) { continue; }
      const tagsLine = lines.find(line => line.indexOf('Tags: ') === 0) || '';
      const savedLine = lines.find(line => line.indexOf('Saved: ') === 0) || '';
      records.push({driveFileId:file.getId(),folder:folder.name,title:lines[0]||file.getName(),url:link,tags:tagsLine.slice(6).split(',').map(t=>t.trim()).filter(Boolean),savedAt:savedLine.slice(7)});
    }
  }
  return {format:'life-archive/captures-v1',records:records};
}
