'use client';
import {useEffect,useState} from 'react';
import QuickCapture from '../quick-capture';
export default function Capture(){
 const [url,setUrl]=useState<string|null>(null),[copied,setCopied]=useState(false),[prefix,setPrefix]=useState('');
 useEffect(()=>{const p=new URLSearchParams(window.location.search);setUrl(p.get('url')||p.get('text')||'');setPrefix(window.location.origin+'/capture?url=');},[]);
 return <main className="life-home life-working-home"><div className="life-home-heading"><h1>Save to Vault</h1></div>{url!==null&&<QuickCapture initialUrl={url}/>}<p><a href="/vault">Open Vault</a></p><details className="phone-capture-help"><summary>Use from your iPhone share sheet</summary><ol><li>In Shortcuts, create a shortcut that receives URLs from the Share Sheet.</li><li>Add “URL Encode” for the Shortcut Input.</li><li>Add a “URL” action. Paste the prefix below, then insert the “URL Encoded Text” variable immediately after it.<p><input aria-label="Shortcut URL prefix" readOnly value={prefix}/></p><button type="button" onClick={()=>void navigator.clipboard.writeText(prefix).then(()=>setCopied(true)).catch(()=>setCopied(false))}>{copied?'Copied':'Copy URL prefix'}</button></li><li>Add “Open URLs”. Name the shortcut “Save to Vault”.</li></ol><p>Choose Save to Vault when sharing a link. You can choose its collection before saving; it appears in Vault immediately.</p><p>Existing shortcuts that open the older Drive capture page need their URL replaced once.</p></details></main>;
}
