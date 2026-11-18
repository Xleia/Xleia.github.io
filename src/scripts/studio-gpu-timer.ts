/** Optional WebGL2 GPU elapsed-time queries, collected without blocking the GPU.
 * Works only where EXT_disjoint_timer_query_webgl2 is exposed.
 * Do not call getQueryParameter(QUERY_RESULT) before QUERY_RESULT_AVAILABLE.
 */
type TimerExtension = { TIME_ELAPSED_EXT:number; GPU_DISJOINT_EXT:number };
export function createStudioGpuTimer(gl:WebGL2RenderingContext) {
  const ext=gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExtension|null;
  const waiting:WebGLQuery[]=[];
  const measurements:number[]=[];
  let active:WebGLQuery|null=null;
  let discarded=false;
  const remove=(query:WebGLQuery)=>gl.deleteQuery(query);
  const clearPending=()=>{
    for(const query of waiting)remove(query);
    waiting.length=0;
  };
  const poll=()=>{
    if(!ext)return;
    if(gl.isContextLost()||gl.getParameter(ext.GPU_DISJOINT_EXT)){
      discarded=true;
      clearPending();
      measurements.length=0;
      return;
    }
    // Read only completed queries; never introduce a synchronous GPU stall.
    for(let i=waiting.length-1;i>=0;i--){
      const query=waiting[i];
      if(gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE)===true){
        const nanoseconds=gl.getQueryParameter(query,gl.QUERY_RESULT) as number;
        if(Number.isFinite(nanoseconds)&&nanoseconds>=0)
          measurements.push(nanoseconds/1e6);
        waiting.splice(i,1);remove(query);
      }
    }
  };
  return {
    supported:!!ext,
    start(){
      if(!ext||active||waiting.length>=8||gl.isContextLost())return;
      poll();
      const query=gl.createQuery();if(!query)return;
      gl.beginQuery(ext.TIME_ELAPSED_EXT,query);
      active=query;
    },
    stop(){
      if(!ext||!active)return;
      gl.endQuery(ext.TIME_ELAPSED_EXT);
      waiting.push(active);
      active=null;
    },
    poll,
    results(){poll();return {supported:!!ext,disjoint:discarded,timings:[...measurements],pending:waiting.length};},
    reset(){
      if(active&&ext){gl.endQuery(ext.TIME_ELAPSED_EXT);remove(active);active=null;}
      clearPending();measurements.length=0;discarded=false;
    },
    dispose(){
      if(active&&ext){gl.endQuery(ext.TIME_ELAPSED_EXT);remove(active);active=null;}
      clearPending();measurements.length=0;
    }
  };
}
