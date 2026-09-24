// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useLiveNews } from '../src/hooks/useLiveNews';
const item = {id:'one', title:'Gold rises', source:'Test', sourceId:'test',publisher:'Test',url:'https://example.com/one',publishedAt:'2026-09-24T12:00:00Z',dateKind:'published',categories:['Gold']};
const payload = (items = [item]) => ({items,sources:[{id:'test',name:'Test',status:'ok',fetchedAt:'2026-09-24T12:01:00Z',error:null}],checkedAt:new Date().toISOString()});
const response = (body = payload(), ok=true) => ({ok,json:async()=>body});
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-24T12:02:00Z'));Object.defineProperty(document,'hidden',{configurable:true,value:false});Object.defineProperty(window,'scrollY',{configurable:true,value:0});});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
it('polls after 60 seconds without clearing the existing feed and cleans up', async()=>{
 const fetcher=vi.fn().mockResolvedValue(response());vi.stubGlobal('fetch',fetcher);
 const hook=renderHook(()=>useLiveNews());await act(async()=>{});
 expect(hook.result.current.items).toHaveLength(1);
 await act(async()=>{vi.advanceTimersByTime(60000);});expect(fetcher).toHaveBeenCalledTimes(2);
 hook.unmount();await act(async()=>{vi.advanceTimersByTime(60000);});expect(fetcher).toHaveBeenCalledTimes(2);
});
it('keeps previously loaded items on failure and updates source health',async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(response()).mockResolvedValue(response({...payload([]),sources:[{id:'test',name:'Test',status:'error',fetchedAt:null,error:'HTTP 503'}]},false));vi.stubGlobal('fetch',fetcher);
 const hook=renderHook(()=>useLiveNews());await act(async()=>{});
 await act(async()=>{vi.advanceTimersByTime(60000);});expect(hook.result.current.items).toHaveLength(1);expect(hook.result.current.error).toBeTruthy();expect(hook.result.current.sources[0].status).toBe('error');
});
it('pauses in hidden tabs and checks again when visible',async()=>{
 const fetcher=vi.fn().mockResolvedValue(response());vi.stubGlobal('fetch',fetcher);renderHook(()=>useLiveNews());await act(async()=>{});
 Object.defineProperty(document,'hidden',{configurable:true,value:true});await act(async()=>{vi.advanceTimersByTime(60000);});expect(fetcher).toHaveBeenCalledTimes(1);
 Object.defineProperty(document,'hidden',{configurable:true,value:false});await act(async()=>{document.dispatchEvent(new Event('visibilitychange'));});expect(fetcher).toHaveBeenCalledTimes(2);
});
it('queues new stories while reading then displays them without a page reload',async()=>{
 const next={...item,id:'two',url:'https://example.com/two',publishedAt:'2026-09-24T12:03:00Z'};
 const fetcher=vi.fn().mockResolvedValueOnce(response()).mockResolvedValue(response(payload([next,item])));vi.stubGlobal('fetch',fetcher);
 const hook=renderHook(()=>useLiveNews());await act(async()=>{});Object.defineProperty(window,'scrollY',{configurable:true,value:500});
 await act(async()=>{vi.advanceTimersByTime(60000);});expect(hook.result.current.items).toHaveLength(1);expect(hook.result.current.pending).toHaveLength(2);
 act(()=>hook.result.current.showPending());expect(hook.result.current.items[0].id).toBe('two');
});
