import assert from 'node:assert/strict';
import test from 'node:test';
import { localPreview } from '../build/local-preview.ts';

function request(address,host){
  const plugin=localPreview();let middleware;
  plugin.configureServer({middlewares:{use(value){middleware=value;}}});
  const req={socket:{remoteAddress:address},headers:{host,'oai-authenticated-user-id':'forged'},rawHeaders:['Host',host,'oai-authenticated-user-id','forged']};
  let status=200,next=false;
  middleware(req,{writeHead(code){status=code;return this;},end(){}},()=>{next=true;});
  return {plugin,req,status,next};
}
test('preview identity is restricted to the development loopback server',()=>{
  const local=request('127.0.0.1','127.0.0.1:5178');
  assert.equal(local.plugin.apply,'serve');assert.equal(local.next,true);
  assert.equal(local.req.headers['oai-authenticated-user-id'],'life-local-preview');
  assert.ok(!local.req.rawHeaders.includes('forged'));
  assert.equal(request('10.0.0.2','127.0.0.1:5178').status,403);
  assert.equal(request('127.0.0.1','attacker.example:5178').status,403);
});
