"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SalesShell } from "@/components/SalesShell";

interface SO {
  id:string; order_no:string; tags:string|null; ref_order_no:string|null;
  responsible:string|null; status:string; sales_status:string;
  customer_name:string|null; customer_no:string|null; customer_ref:string|null;
  shipment_date:string|null; eta:string|null; ship_from:string|null;
  awb:string|null; delivery_terms:string|null; delivery_place:string|null;
  amount:number|null; currency:string; exchange_rate:number|null;
  request_units:string|null; request_requested:number|null;
  allocated_units:string|null; allocated_all:number|null; allocated_measure:string|null;
  difference_units:string|null; difference_value:number|null;
}

const TABS = ["UNCONFIRMED","CONFIRMED","ALL","POSTED","GLOBLA TEST"];

function fmtD(d:string|null){if(!d)return"";const p=d.slice(0,10).split("-");return`${p[1]}/${p[2]}/${p[0].slice(2)}`;}
function fmt(n:number|null,dec=2){if(n==null||n===0)return"";const s=Math.abs(n).toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g,",");return n<0?`-${s}`:s;}

const thG:React.CSSProperties={fontSize:9,fontWeight:700,color:"#003160",letterSpacing:".06em",textTransform:"uppercase",padding:"4px 6px 0",textAlign:"left",borderBottom:"none",whiteSpace:"nowrap",background:"#fff"};
const thC:React.CSSProperties={fontSize:8.5,fontWeight:700,color:"#003160",letterSpacing:".04em",textTransform:"uppercase",padding:"1px 6px 5px",borderBottom:"2px solid #E4E7EC",textAlign:"right",whiteSpace:"nowrap",background:"#fff"};
const thCL:React.CSSProperties={...thC,textAlign:"left"};
const td:React.CSSProperties={padding:"0 6px",height:"43px",fontSize:11,color:"#344054",borderBottom:"1px solid #F2F4F7",whiteSpace:"nowrap",verticalAlign:"middle"};
const tdR:React.CSSProperties={...td,textAlign:"right",fontFamily:"'Roboto Mono',monospace",fontVariantNumeric:"tabular-nums"};

function Badges(){return(<div style={{display:"flex",gap:2,flexShrink:0}}><span style={{fontSize:8.5,fontWeight:700,padding:"1px 4px",borderRadius:2,background:"#1D4ED8",color:"#fff"}}>U</span><span style={{fontSize:8.5,fontWeight:700,padding:"1px 4px",borderRadius:2,background:"#1D4ED8",color:"#fff"}}>SA</span></div>);}
function TmsStatus(){return(<div style={{display:"flex",gap:4,alignItems:"center"}}><span style={{width:10,height:10,borderRadius:"50%",background:"#22C55E",display:"inline-block",flexShrink:0}}/><span style={{display:"flex",gap:1}}><span style={{width:9,height:9,borderRadius:"50%",border:"1.5px solid #EF4444",display:"inline-block"}}/><span style={{width:9,height:9,borderRadius:"50%",border:"1.5px solid #EF4444",display:"inline-block"}}/></span><span style={{display:"flex",gap:1}}><span style={{width:9,height:9,borderRadius:"50%",border:"1.5px solid #EF4444",display:"inline-block"}}/><span style={{width:9,height:9,borderRadius:"50%",border:"1.5px solid #EF4444",display:"inline-block"}}/></span><span style={{width:9,height:9,borderRadius:"50%",border:"1.5px solid #EF4444",display:"inline-block"}}/></div>);}

export default function SalesOrderList() {
  const router = useRouter();
  const [orders,setOrders] = useState<SO[]>([]);
  const [loading,setLoading] = useState(true);
  const [tab,setTab] = useState("UNCONFIRMED");
  const load = useCallback(async()=>{
    setLoading(true);
    const res = await fetch("/api/sales-orders");
    if(res.ok) setOrders(await res.json());
    setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  const filtered = orders.filter(o=>{
    if(tab==="ALL") return true;
    if(tab==="UNCONFIRMED") return o.status==="unconfirmed";
    if(tab==="CONFIRMED") return o.status==="confirmed";
    if(tab==="POSTED") return o.status==="posted";
    return true;
  });


  return (
    <SalesShell>
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:"Inter,sans-serif"}}>

      {/* Tab bar */}
      <div style={{background:"#fff",borderBottom:"1px solid #E4E7EC",padding:"8px 16px",display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
        {TABS.map(t=>{
          const count = t==="UNCONFIRMED"?orders.filter(o=>o.status==="unconfirmed").length:t==="CONFIRMED"?orders.filter(o=>o.status==="confirmed").length:null;
          const active = tab===t;
          return (
            <button key={t} onClick={()=>setTab(t)} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:2,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:11.5,fontWeight:700,letterSpacing:".04em",background:active?"#003160":"#F2F4F7",color:active?"#fff":"#667085"}}>
              {t}
              {count!==null&&<span style={{fontSize:9.5,fontWeight:700,padding:"0 5px",borderRadius:8,background:active?"rgba(255,255,255,0.2)":"#D0D5DD",color:active?"#fff":"#667085",minWidth:16,textAlign:"center" as const}}>{count}</span>}
            </button>
          );
        })}
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          {["search","delete_sweep","refresh","filter_list"].map(icon=>(
            <button key={icon} style={{width:28,height:28,border:"1px solid #E4E7EC",borderRadius:2,background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontFamily:"Material Icons",fontSize:16,color:"#667085"}}>{icon}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter strip */}
      <div style={{background:"#fff",borderBottom:"1px solid #F2F4F7",padding:"4px 16px",display:"flex",alignItems:"center",gap:8}}>
        <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"2px 8px",background:"#F2F4F7",borderRadius:2,fontSize:10.5,color:"#344054"}}>
          <span style={{fontWeight:700,color:"#003160"}}>SALES ORDER TYPE:</span>
          Sales, Reverse, Quantity Invoice, Value Invoice, Quantity …
        </span>

      </div>

      {/* Table */}
      <div style={{flex:1,overflowY:"auto",overflowX:"auto",background:"#fff"}}>
        {loading ? (
          <div style={{padding:40,textAlign:"center",color:"#98A2B3",fontSize:13}}>Loading…</div>
        ) : (
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead style={{position:"sticky",top:0,zIndex:10}}>
              <tr style={{background:"#fff"}}>
                <th colSpan={5} style={thG}>ORDER <span style={{fontFamily:"Material Icons",fontSize:10,verticalAlign:"middle",color:"#98A2B3"}}>arrow_upward</span></th>
                <th colSpan={3} style={thG}>CUSTOMER <span style={{fontFamily:"Material Icons",fontSize:10,verticalAlign:"middle",color:"#98A2B3"}}>keyboard_arrow_left</span></th>
                <th colSpan={7} style={thG}>SHIPMENT <span style={{fontFamily:"Material Icons",fontSize:10,verticalAlign:"middle",color:"#98A2B3"}}>keyboard_arrow_left</span></th>
                <th colSpan={3} style={thG}>AMOUNT <span style={{fontFamily:"Material Icons",fontSize:10,verticalAlign:"middle",color:"#98A2B3"}}>keyboard_arrow_left</span></th>
                <th colSpan={2} style={thG}>REQUEST</th>
                <th colSpan={3} style={thG}>ALLOCATED</th>
                <th colSpan={2} style={thG}>DIFFERENCE</th>
                <th style={{...thG,textAlign:"right" as const}}><span style={{fontFamily:"Material Icons",fontSize:14,color:"#D0D5DD"}}>view_column</span></th>
              </tr>
              <tr style={{background:"#fff"}}>
                <th style={{...thCL,width:56}}></th>
                <th style={thCL}>NO</th>
                <th style={thCL}>TAGS</th>
                <th style={thCL}>REF. ORDER<br/>NO</th>
                <th style={thCL}>RESPONSIBLE</th>
                <th style={thCL}>NAME</th>
                <th style={thCL}>NO</th>
                <th style={thCL}>REF</th>
                <th style={thCL}>DATE</th>
                <th style={thCL}>ETA</th>
                <th style={thCL}>FROM</th>
                <th style={thCL}>AWB</th>
                <th style={thCL}>DT</th>
                <th style={thCL}>DP</th>
                <th style={thCL}>TMS STATUS</th>
                <th style={thC}>AMOUNT</th>
                <th style={thCL}>CCY</th>
                <th style={thC}>EXCHANGE<br/>RATE</th>
                <th style={thCL}>UNITS</th>
                <th style={thC}>REQUESTED</th>
                <th style={thCL}>UNITS</th>
                <th style={thC}>ALL.</th>
                <th style={thCL}>MEA.</th>
                <th style={thCL}>UNITS</th>
                <th style={thC}>DIFF.</th>
                <th style={{...thC,width:28}}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o=>{
                
                return (
                  <tr key={o.id}
                    style={{cursor:"pointer",borderLeft:"3px solid #22C55E"}}
                    onMouseEnter={e=>{e.currentTarget.style.background="#F8FAFC";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="";}}>
                    <td style={{...td,paddingLeft:6}} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>
                      <Badges/>
                    </td>
                    <td style={{...td,fontWeight:600}} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{o.order_no}</td>
                    <td style={td} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{o.tags??""}</td>
                    <td style={td} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{o.ref_order_no??""}</td>
                    <td style={{...td,maxWidth:110,overflow:"hidden",textOverflow:"ellipsis"}} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{o.responsible??""}</td>
                    <td style={{...td,maxWidth:130,overflow:"hidden",textOverflow:"ellipsis"}} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{o.customer_name??""}</td>
                    <td style={td} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{o.customer_no??""}</td>
                    <td style={td} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{o.customer_ref??""}</td>
                    <td style={td} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{fmtD(o.shipment_date)}</td>
                    <td style={td} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{fmtD(o.eta)}</td>
                    <td style={{...td,maxWidth:90,overflow:"hidden",textOverflow:"ellipsis"}} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{o.ship_from??""}</td>
                    <td style={td} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{o.awb??""}</td>
                    <td style={td} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{o.delivery_terms??""}</td>
                    <td style={td} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{o.delivery_place??""}</td>
                    <td style={td} onClick={()=>router.push(`/sales-order/${o.order_no}`)}><TmsStatus/></td>
                    <td style={{...tdR,color:o.amount!=null&&o.amount<0?"#EF4444":"#344054"}} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{fmt(o.amount,3)}</td>
                    <td style={td} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{o.currency}</td>
                    <td style={tdR} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{fmt(o.exchange_rate,1)}</td>
                    <td style={td} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{o.request_units??""}</td>
                    <td style={tdR} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{fmt(o.request_requested)}</td>
                    <td style={td} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{o.allocated_units??""}</td>
                    <td style={tdR} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{fmt(o.allocated_all)}</td>
                    <td style={td} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{o.allocated_measure??""}</td>
                    <td style={{...td,color:o.difference_value!=null&&o.difference_value<0?"#EF4444":"#344054"}} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{o.difference_units??""}</td>
                    <td style={{...tdR,color:o.difference_value!=null&&o.difference_value<0?"#EF4444":"#344054"}} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>{fmt(o.difference_value)}</td>
                    <td style={{...td,color:"#D0D5DD"}} onClick={()=>router.push(`/sales-order/${o.order_no}`)}>
                      <span style={{fontFamily:"Material Icons",fontSize:14}}>more_vert</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
    </SalesShell>
  );
} 
