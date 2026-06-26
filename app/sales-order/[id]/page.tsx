"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { SalesShell } from "@/components/SalesShell";

// ── Interfaces ────────────────────────────────────────────────────────────────
interface Item { id:string; item_no:string; item_name:string; species:string; quality:string; size:string; eu_customtariff:string; }
interface PalletUnit { id:string; unit_no:string; packing_plant:string|null; tags:string|null; comment:string|null; landing_no:string|null; packed_date:string|null; original_eta:string|null; use_by_date:string|null; po_no:string|null; reserved_to_so:string|null; sales_price:number|null; value_pr_weight:number; inventory_value:number; total_kg:number; reserved_kg:number; allocated_kg:number; available_kg:number; }
interface Pallet { id:string; pallet_no:string; warehouse:string; item_no:string; po_no:string|null; packed_date:string|null; order_date:string|null; packing:string|null; tags:string|null; location:string|null; value_pr_weight:number; inventory_value:number; sales_price:number|null; total_kg:number; reserved_kg:number; allocated_kg:number; available_kg:number; pallet_units:PalletUnit[]; }
interface SOLine { id:string; item_no:string|null; item_name:string|null; recipient:string|null; notes:string|null; units:string|null; pieces_per_unit:number; quantity_requested:number; amount_requested:number; prereserved_units:string|null; prereserved_quantity:number; prereserved_amount:number; allocated_units:string|null; allocated_quantity:number; allocated_total_pieces:number; allocated_quantity2:number; allocated_from_po:string|null; diff_units:string|null; diff_total_pieces:number; diff_quantity:number; price:number; price_unit:string|null; price_quantity:number; discount_value:number; discount_type:string; net_amount:number; parent_line_id:string|null; is_split:boolean; }
interface SOCost { id:string; cost:string|null; included:boolean; description:string|null; calculation_method:string|null; distribution_method:string|null; no_of_units:number; gross_weight:number; net_weight:number; price:number; total_amount:number; }
interface SO { id:string; order_no:string; status:string; responsible:string|null; customer_name:string|null; shipment_date:string|null; eta:string|null; ship_from:string|null; currency:string; quantity_measure:string; person_responsible:string|null; sales_order_lines:SOLine[]; sales_order_costs:SOCost[]; }

// ── Helpers ───────────────────────────────────────────────────────────────────
const TABS = ["REQUEST","GENERAL","FINANCE","SHIPMENT","INTERNAL COSTS","DOC TEXTS","DOCUMENTS"];
function n(v:number|null|undefined,d=2){if(v==null)return"0."+"0".repeat(d);return v.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g,",");}
function fD(d:string|null){if(!d)return"—";const p=d.slice(0,10).split("-");return`${p[1]}/${p[2]}/${p[0].slice(2)}`;}

// ── Shared table styles ───────────────────────────────────────────────────────
const G:React.CSSProperties={fontSize:9,fontWeight:700,color:"#003160",textTransform:"uppercase",letterSpacing:".06em",padding:"6px 8px 2px",textAlign:"left",borderBottom:"none",whiteSpace:"nowrap",background:"#fff"};
const H:React.CSSProperties={fontSize:9,fontWeight:700,color:"#003160",textTransform:"uppercase",letterSpacing:".04em",padding:"0 8px 6px",borderBottom:"2px solid #E4E7EC",textAlign:"right",whiteSpace:"nowrap",background:"#fff"};
const HL:React.CSSProperties={...H,textAlign:"left"};
const C:React.CSSProperties={padding:"0 8px",height:"43px",fontSize:11.5,color:"#344054",borderBottom:"1px solid #F2F4F7",whiteSpace:"nowrap",verticalAlign:"middle"};
const CR:React.CSSProperties={...C,textAlign:"right",fontFamily:"'Roboto Mono',monospace",fontVariantNumeric:"tabular-nums"};
const CB:React.CSSProperties={...CR,color:"#446BF9"};
const CRed:React.CSSProperties={...CR,color:"#EF4444"};

// ── Sub-components ────────────────────────────────────────────────────────────
function UIn({val,save,w=80,r}:{val:string;save:(v:string)=>void;w?:number;r?:boolean}){
  const [v,setV]=useState(val);const ref=useRef<HTMLInputElement>(null);
  useEffect(()=>setV(val),[val]);
  return <input ref={ref} value={v} onChange={e=>setV(e.target.value)} onBlur={()=>{if(v!==val)save(v);}} onKeyDown={e=>{if(e.key==="Enter"){if(v!==val)save(v);ref.current?.blur();}if(e.key==="Escape"){setV(val);ref.current?.blur();}}} style={{width:w,border:"none",borderBottom:"1px solid #98A2B3",outline:"none",fontSize:11.5,fontFamily:"inherit",padding:"1px 0",textAlign:r?"right":"left",background:"transparent",color:"#344054"}}/>;
}
function USel({val,opts,save,w=72}:{val:string;opts:string[];save:(v:string)=>void;w?:number}){
  return <select value={val} onChange={e=>save(e.target.value)} style={{width:w,border:"none",borderBottom:"1px solid #98A2B3",outline:"none",fontSize:11,fontFamily:"inherit",padding:"1px 0",background:"transparent",color:"#667085",cursor:"pointer",appearance:"none" as const}}>{opts.map(o=><option key={o}>{o}</option>)}</select>;
}
function HF({label,blue,children}:{label:string;blue?:boolean;children:React.ReactNode}){
  return (
    <div style={{display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 14px",minWidth:0,flex:"1 1 0",minHeight:63}}>
      <div style={{fontSize:8.5,fontWeight:700,color:"#003160",textTransform:"uppercase" as const,letterSpacing:".07em",marginBottom:2,whiteSpace:"nowrap" as const}}>{label}</div>
      <div style={{fontSize:11.5,fontWeight:600,color:blue?"#003160":"#101828",whiteSpace:"nowrap" as const,overflow:"hidden",textOverflow:"ellipsis"}}>{children??<span style={{color:"#D0D5DD"}}>—</span>}</div>
    </div>
  );
}

// ── PriceInput for pallet rows ───────────────────────────────────────────────
function PriceInput({val,original,pending,onStage,tabIndex}:{val:number;original:number;pending?:number;onStage:(p:number)=>void;tabIndex?:number}){
  const [editing,setEditing]=useState(false);
  const displayVal = pending ?? val;
  const [v,setV]=useState(displayVal.toFixed(3));
  const ref=useRef<HTMLInputElement>(null);
  const changed = pending !== undefined && pending !== original;
  useEffect(()=>setV((pending??val).toFixed(3)),[val,pending]);
  function commit(){
    const p=parseFloat(v);
    if(!isNaN(p)){onStage(p);}
    setEditing(false);
  }
  // When focused via tab, auto-enter editing mode
  function handleFocus(){setEditing(true);setTimeout(()=>{ref.current?.select();},10);}
  return editing ? (
    <input ref={ref} autoFocus value={v}
      tabIndex={tabIndex}
      onChange={e=>setV(e.target.value)}
      onBlur={commit}
      onKeyDown={e=>{
        if(e.key==="Enter"||e.key==="Tab"){
          e.preventDefault();
          commit();
          // Move focus to next/prev tabIndex
          const dir = e.shiftKey ? -1 : 1;
          const next = (tabIndex??0) + dir;
          const el = document.querySelector(`[tabindex="${next}"]`) as HTMLElement|null;
          if(el) el.focus();
        }
        if(e.key==="Escape"){setV((pending??val).toFixed(3));setEditing(false);}
      }}
      style={{width:72,border:"none",borderBottom:"2px solid #446BF9",outline:"none",fontSize:11.5,fontFamily:"'Roboto Mono',monospace",textAlign:"right" as const,background:"transparent",color:"#101828"}}
    />
  ) : (
    <span
      tabIndex={tabIndex}
      onFocus={handleFocus}
      onClick={e=>{e.stopPropagation();setEditing(true);setTimeout(()=>ref.current?.select(),10);}}
      title="Click or Tab to change price"
      style={{cursor:"text",color:changed?"#F59E0B":"inherit",fontWeight:changed?700:400,
        borderBottom:changed?"2px solid #F59E0B":"1px solid #98A2B3",paddingBottom:1,
        display:"inline-block",outline:"none"}}>
      {displayVal.toFixed(3)}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SODetail() {
  const {id} = useParams<{id:string}>();
  const [order,setOrder] = useState<SO|null>(null);
  const [lines,setLines] = useState<SOLine[]>([]);
  const [loading,setLoading] = useState(true);
  const [tab,setTab] = useState("REQUEST");
  const [adding,setAdding] = useState(false);
  const [searchQ,setSearchQ] = useState("");
  const [searchResults,setSearchResults] = useState<Item[]>([]);
  const [searchOpen,setSearchOpen] = useState(false);
  const [editingLine,setEditingLine] = useState<string|null>(null);
  const [expandedLine,setExpandedLine] = useState<string|null>(null);
  const [expandedUnits,setExpandedUnits] = useState<Set<string>>(new Set());
  const [pallets,setPallets] = useState<Record<string,Pallet[]>>({});
  const [linePrices,setLinePrices] = useState<Record<string,number>>({});
  const [palletsLoading,setPalletsLoading] = useState<string|null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async()=>{
    setLoading(true);
    const r = await fetch(`/api/sales-orders/${id}`);
    if(r.ok){const d=await r.json();setOrder(d);setLines((d.sales_order_lines??[]).sort((a:SOLine,b:SOLine)=>Number(a.item_no)-Number(b.item_no)));}
    setLoading(false);
  },[id]);

  useEffect(()=>{load();},[load]);

  useEffect(()=>{
    if(!document.querySelector("link[href*='Material+Icons']")){const l=document.createElement("link");l.rel="stylesheet";l.href="https://fonts.googleapis.com/icon?family=Material+Icons";document.head.appendChild(l);}
  },[]);

  useEffect(()=>{
    if(!searchQ.trim()){setSearchResults([]);return;}
    const t=setTimeout(async()=>{const r=await fetch(`/api/items?q=${encodeURIComponent(searchQ)}`);if(r.ok)setSearchResults(await r.json());},200);
    return()=>clearTimeout(t);
  },[searchQ]);

  async function sl(lid:string,patch:Record<string,unknown>){
    await fetch(`/api/sales-order-lines/${lid}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(patch)});
    setLines(prev=>prev.map(l=>l.id===lid?{...l,...patch}:l));
    // Cascade price to pallets/units if price changed
    if("price" in patch) {
      await fetch("/api/so-line-cascade-price",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({line_id:lid, new_price:patch.price})});
    }
  }
  async function addLine(item:Item){
    if(!order)return;
    const res=await fetch("/api/sales-order-lines",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sales_order_id:order.id,item_no:item.item_no,item_name:item.item_name,sort_order:lines.length+1})});
    if(res.ok){const newLine=await res.json();setLines(prev=>[...prev,newLine]);setEditingLine(newLine.id);}
    setAdding(false);setSearchQ("");setSearchResults([]);
  }
  async function deleteLine(lid:string){
    await fetch(`/api/sales-order-lines/${lid}`,{method:"DELETE"});
    setLines(prev=>prev.filter(l=>l.id!==lid));
  }
  async function toggleExpand(lid:string){
    if(expandedLine===lid){setExpandedLine(null);return;}
    setExpandedLine(lid);
    if(!pallets[lid]){
      setPalletsLoading(lid);
      const r=await fetch(`/api/so-line-pallets/${lid}`);
      if(r.ok){const d=await r.json();setPallets(prev=>({...prev,[lid]:d.pallets}));setLinePrices(prev=>({...prev,[lid]:d.line_price}));}
      setPalletsLoading(null);
    }
  }
  function toggleUnits(palletId:string){
    setExpandedUnits(prev=>{const next=new Set(prev);next.has(palletId)?next.delete(palletId):next.add(palletId);return next;});
  }

  const [contextMenu,setContextMenu] = useState<{lineId:string;x:number;y:number}|null>(null);
  const [allocateModal,setAllocateModal] = useState<{lineId:string;itemName:string;requested:number;ppu:number}|null>(null);
  const [allocateQty,setAllocateQty] = useState<string>("");
  const [allocating,setAllocating] = useState(false);
  const [splitError,setSplitError] = useState<string|null>(null);
  // staging: unitId -> newPrice
  const [pendingPrices,setPendingPrices] = useState<Record<string,number>>({});
  const [applying,setApplying] = useState(false);

  // Stage a price change for a unit (does not save yet)
  function stagePriceForUnit(unitId:string, newPrice:number, originalPrice:number) {
    setPendingPrices(prev => {
      if(newPrice === originalPrice) {
        const next = {...prev};
        delete next[unitId];
        return next;
      }
      return {...prev, [unitId]: newPrice};
    });
  }

  // Stage all units on a pallet
  function stagePriceForPallet(palletUnits:{id:string;value_pr_weight:number}[], newPrice:number) {
    setPendingPrices(prev => {
      const next = {...prev};
      for(const u of palletUnits) {
        if(newPrice === u.value_pr_weight) delete next[u.id];
        else next[u.id] = newPrice;
      }
      return next;
    });
  }

  // Apply all pending changes — group by price, one SO line per group
  async function applyChanges(lineId:string) {
    if(!Object.keys(pendingPrices).length) return;
    setApplying(true);
    setSplitError(null);

    // Group unit IDs by new price
    const groups: Record<number, string[]> = {};
    for(const [uid, price] of Object.entries(pendingPrices)) {
      if(!groups[price]) groups[price] = [];
      groups[price].push(uid);
    }
    const changes = Object.entries(groups).map(([price, unit_ids]) => ({
      unit_ids, new_price: parseFloat(price)
    }));

    const res = await fetch("/api/so-line-split", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({line_id:lineId, changes}),
    });

    if(res.ok) {
      setPendingPrices({});
      await load();
      setExpandedLine(null);
      setExpandedUnits(new Set());
    } else {
      const d = await res.json().catch(()=>({}));
      setSplitError(d.error ?? "Apply failed — please try again");
    }
    setApplying(false);
  }

  async function allocateItem() {
    if(!allocateModal) return;
    const qty = parseInt(allocateQty);
    if(isNaN(qty) || qty <= 0) return;
    setAllocating(true);
    setSplitError(null);
    const res = await fetch("/api/so-line-allocate", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({line_id: allocateModal.lineId, allocate_units: qty}),
    });
    if(res.ok) {
      await load();
      setAllocateModal(null);
      setAllocateQty("");
    } else {
      const d = await res.json().catch(()=>({}));
      setSplitError(d.error ?? "Allocation failed");
    }
    setAllocating(false);
  }

  async function revertLine(lineId:string) {
    const res = await fetch("/api/so-line-revert",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({line_id:lineId}),
    });
    if(res.ok) { await load(); setContextMenu(null); }
  }

  if(loading) return <SalesShell><div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#98A2B3",fontSize:13}}>Loading…</div></SalesShell>;
  if(!order) return <SalesShell><div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#EF4444",fontSize:13}}>Order not found</div></SalesShell>;

  const costs = order.sales_order_costs ?? [];
  const tot = lines.reduce((s,l)=>{
    const aq=l.allocated_quantity||(l.quantity_requested||0)*(l.pieces_per_unit||0);
    const d=l.discount_type==="Percent"?(l.discount_value||0)/100:0;
    return s+aq*(l.price||0)*(1-d);
  },0);

  return (
    <SalesShell>
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:"Inter,sans-serif"}}>

      {/* HEADER */}
      <div style={{background:"#fff",borderBottom:"1px solid #E4E7EC",display:"flex",alignItems:"stretch",flexShrink:0,minHeight:63}}>
        {/* Back button */}
        <div style={{display:"flex",alignItems:"center",padding:"0 10px",flexShrink:0}}>
          <button onClick={()=>history.back()} style={{width:28,height:28,border:"none",borderRadius:2,background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}
            onMouseEnter={e=>e.currentTarget.style.background="#F2F4F7"}
            onMouseLeave={e=>e.currentTarget.style.background="none"}>
            <span style={{fontFamily:"Material Icons",fontSize:20,color:"#003160",lineHeight:1}}>arrow_back</span>
          </button>
        </div>
        {/* Badges */}
        <div style={{display:"flex",alignItems:"center",padding:"0 10px",gap:3,flexShrink:0}}>
          <span style={{fontSize:9,fontWeight:800,padding:"2px 5px",borderRadius:2,background:"#003160",color:"#fff",letterSpacing:".04em"}}>U</span>
          <span style={{fontSize:9,fontWeight:800,padding:"2px 5px",borderRadius:2,background:"#446BF9",color:"#fff",letterSpacing:".04em"}}>SA</span>
          <span style={{fontSize:9,fontWeight:800,padding:"2px 5px",borderRadius:2,background:"#22C55E",color:"#fff",letterSpacing:".04em"}}>NE</span>
        </div>
        {/* Fields — spread full width */}
        <div style={{flex:1,display:"flex",alignItems:"stretch"}}>
          <HF label="STATUS">
            <span style={{fontSize:11,fontWeight:600,color:"#101828",textTransform:"capitalize" as const}}>{order.status}</span>
          </HF>
          <HF label="ORDER NO" blue>{order.order_no}</HF>
          <HF label="ORDER DATE">{fD(order.shipment_date)}</HF>
          <HF label="SHIPMENT DATE">{fD(order.shipment_date)}</HF>
          <HF label="SHIP FROM">{order.ship_from}</HF>
          <HF label="CUSTOMER" blue>{order.customer_name}</HF>
          <HF label="PERSON RESPONSIBLE" blue>{order.person_responsible}</HF>
          <HF label="CURRENCY">{order.currency}</HF>
          <HF label="QUANTITY MEASURE">{order.quantity_measure}</HF>
        </div>
        {/* Order actions — gradient button matching SVG */}
        <div style={{display:"flex",alignItems:"center",padding:"0 12px",gap:4,flexShrink:0}}>
          <div style={{display:"flex",borderRadius:2,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.15)"}}>
            <button style={{padding:"0 18px",height:36,background:"linear-gradient(180deg,#446BF9 0%,#0058AC 100%)",color:"#fff",border:"none",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:".03em",borderRight:"1px solid rgba(255,255,255,0.2)"}}>
              Order actions
            </button>
            <button style={{width:34,height:36,background:"linear-gradient(180deg,#446BF9 0%,#0058AC 100%)",color:"#fff",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontFamily:"Material Icons",fontSize:18,lineHeight:1}}>arrow_drop_down</span>
            </button>
          </div>
          <button style={{width:32,height:32,background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}
            onMouseEnter={e=>e.currentTarget.style.background="#F2F4F7"}
            onMouseLeave={e=>e.currentTarget.style.background="none"}>
            <span style={{fontFamily:"Material Icons",fontSize:18,color:"#003160",lineHeight:1}}>open_in_full</span>
          </button>
        </div>
      </div>

      {/* TABS */}
      <div style={{display:"flex",background:"#DFE5EB",flexShrink:0,height:48,alignItems:"center",justifyContent:"center",gap:2}}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{
              padding:"0 18px",
              height:28,
              fontSize:11.5,
              fontWeight:700,
              letterSpacing:".04em",
              color:tab===t?"#fff":"#003160",
              background:tab===t?"#003160":"transparent",
              border:"none",
              borderRadius:2,
              cursor:"pointer",
              whiteSpace:"nowrap" as const,
            }}
            onMouseEnter={e=>{ if(tab!==t) e.currentTarget.style.background="rgba(0,49,96,0.08)"; }}
            onMouseLeave={e=>{ if(tab!==t) e.currentTarget.style.background="transparent"; }}>
            {t}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{flex:1,overflow:"auto",padding:"0 16px 32px"}}>
        {tab === "REQUEST" ? (
          <>
            {/* ── Lines table ── */}
            <div style={{overflowX:"auto",marginTop:0}}>
              <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"auto" as const}}>
                <thead>
                  <tr style={{background:"#fff"}}>
                    <th colSpan={3} style={G}>ITEM</th>
                    <th colSpan={2} style={G}>INFO <span style={{fontFamily:"Material Icons",fontSize:10,verticalAlign:"middle",color:"#98A2B3"}}>keyboard_arrow_left</span></th>
                    <th colSpan={3} style={G}>REQUEST <span style={{fontFamily:"Material Icons",fontSize:10,verticalAlign:"middle",color:"#98A2B3"}}>keyboard_arrow_left</span><span style={{fontSize:8,color:"#98A2B3",marginLeft:4}}>({order.quantity_measure})</span></th>
                    <th colSpan={2} style={G}>PRE RESERVED</th>
                    <th colSpan={4} style={G}>ALLOCATED <span style={{fontSize:8,color:"#98A2B3",marginLeft:4}}>({order.quantity_measure})</span></th>
                    <th colSpan={3} style={G}>DIFFERENCE <span style={{fontSize:8,color:"#98A2B3",marginLeft:4}}>({order.quantity_measure})</span></th>
                    <th colSpan={2} style={G}>PRICE <span style={{fontSize:8,color:"#98A2B3",marginLeft:4}}>({order.currency})</span></th>
                    <th colSpan={2} style={G}>DISCOUNT</th>
                    <th style={{...G,textAlign:"right"}}></th>
                    <th style={{...G,width:26,textAlign:"right"}}><span style={{fontFamily:"Material Icons",fontSize:13,color:"#D0D5DD"}}>view_column</span></th>
                  </tr>
                  <tr>
                    <th style={{...HL,width:28}}></th>
                    <th style={HL}>NO <span style={{fontFamily:"Material Icons",fontSize:10,verticalAlign:"middle"}}>unfold_more</span></th>
                    <th style={HL}>NAME</th>
                    <th style={HL}>RECIPIENT</th>
                    <th style={HL}>NOTES</th>
                    <th style={H}>UNITS</th>
                    <th style={H}>PIECES PR.<br/>UNIT</th>
                    <th style={H}>QUANTITY</th>
                    <th style={H}>UNITS</th>
                    <th style={H}>QUANTITY</th>
                    <th style={H}>UNITS</th>
                    <th style={H}>TOTAL PIECES</th>
                    <th style={H}>QUANTITY</th>
                    <th style={H}>ALLOC. FROM PO</th>
                    <th style={H}>UNITS</th>
                    <th style={H}>TOTAL PIECES</th>
                    <th style={H}>QUANTITY</th>
                    <th style={H}>PRICE</th>
                    <th style={HL}>UNIT</th>
                    <th style={HL}>VALUE</th>
                    <th style={HL}>TYPE</th>
                    <th style={H}>NET AMOUNT</th>
                    <th style={{...H,width:26}}></th>
                  </tr>
                </thead>
                <tbody>
                  {/* Action row */}
                  <tr style={{background:"#F8FAFC",borderBottom:"1px solid #E4E7EC"}}>
                    <td colSpan={23} style={{padding:"4px 8px"}}>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span onClick={()=>{setAdding(true);setTimeout(()=>searchRef.current?.focus(),50);}} style={{fontFamily:"Material Icons",fontSize:22,color:"#446BF9",cursor:"pointer"}}>add_circle</span>
                        <span style={{fontFamily:"Material Icons",fontSize:18,color:"#667085",cursor:"pointer"}}>lock</span>
                        <span style={{fontFamily:"Material Icons",fontSize:18,color:"#667085",cursor:"pointer"}}>delete_outline</span>
                        {expandedLine && (
                          <button onClick={()=>{setExpandedLine(null);setExpandedUnits(new Set());}}
                            style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:4,padding:"2px 8px",border:"1px solid #D0D5DD",borderRadius:2,background:"#fff",cursor:"pointer",fontSize:11,color:"#667085",fontFamily:"inherit"}}>
                            <span style={{fontFamily:"Material Icons",fontSize:13}}>unfold_more</span>
                            Show all items
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Add row */}
                  {adding && (
                    <tr style={{background:"#EEF4FF",borderBottom:"1px solid #C7D7F5"}}>
                      <td colSpan={23} style={{padding:"6px 8px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,position:"relative" as const}}>
                          <span style={{fontFamily:"Material Icons",fontSize:15,color:"#446BF9"}}>search</span>
                          <input ref={searchRef} value={searchQ}
                            onChange={e=>{setSearchQ(e.target.value);setSearchOpen(true);}}
                            onFocus={()=>setSearchOpen(true)}
                            placeholder="Search by item name, number or species…"
                            style={{flex:1,border:"none",borderBottom:"2px solid #446BF9",outline:"none",fontSize:12.5,fontFamily:"inherit",padding:"4px 0",background:"transparent",color:"#101828"}}
                          />
                          <button onClick={()=>{setAdding(false);setSearchQ("");setSearchResults([]);}} style={{border:"none",background:"none",cursor:"pointer",color:"#667085",fontFamily:"Material Icons",fontSize:16}}>close</button>
                          {searchOpen && searchResults.length > 0 && (
                            <div style={{position:"absolute" as const,top:"100%",left:0,right:0,background:"#fff",border:"1px solid #E4E7EC",borderRadius:2,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:100,maxHeight:280,overflowY:"auto"}}>
                              {searchResults.map(item=>(
                                <div key={item.id} onClick={()=>{setSearchOpen(false);addLine(item);}}
                                  style={{padding:"8px 12px",cursor:"pointer",borderBottom:"1px solid #F2F4F7",display:"flex",alignItems:"center",gap:12}}
                                  onMouseEnter={e=>(e.currentTarget.style.background="#F8FAFC")}
                                  onMouseLeave={e=>(e.currentTarget.style.background="")}>
                                  <div>
                                    <span style={{fontSize:10,fontWeight:700,color:"#446BF9",marginRight:8}}>{item.item_no}</span>
                                    <span style={{fontSize:12.5,color:"#101828",fontWeight:600}}>{item.species}</span>
                                    <span style={{fontSize:11,color:"#667085",marginLeft:6}}>{item.quality} · {item.size}</span>
                                  </div>
                                  <span style={{fontSize:10,color:"#98A2B3",marginLeft:"auto",maxWidth:200,textAlign:"right" as const,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{item.eu_customtariff.split(" - ")[0]}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {searchOpen && searchQ.length > 0 && searchResults.length === 0 && (
                            <div style={{position:"absolute" as const,top:"100%",left:0,right:0,background:"#fff",border:"1px solid #E4E7EC",borderRadius:2,padding:"12px",fontSize:12,color:"#98A2B3",zIndex:100}}>No items found for "{searchQ}"</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Line rows */}
                  {(expandedLine ? lines.filter(l=>l.id===expandedLine) : lines).map(l=>{
                    const isEditing = editingLine===l.id;
                    const isExpanded = expandedLine===l.id;
                    const units    = l.quantity_requested||0;
                    const ppu      = l.pieces_per_unit||0;
                    const qty      = units*ppu;
                    const allocQty = l.allocated_quantity||qty;
                    const allocPcs = l.allocated_total_pieces||qty;
                    const disc     = l.discount_type==="Percent"?(l.discount_value||0)/100:0;
                    const netAmt   = allocQty*(l.price||0)*(1-disc);
                    const diffPcs  = allocPcs-qty;
                    const diffQty  = allocQty-qty;
                    return (
                      <tr key={l.id}
                        onClick={()=>setEditingLine(l.id)}
                        style={{background:isExpanded?"#EEF4FF":isEditing?"#F0F5FF":"",cursor:"pointer",borderLeft:l.is_split?"3px solid #F59E0B":undefined}}
                        onMouseEnter={e=>{if(!isEditing&&!isExpanded)e.currentTarget.style.background="#F8FAFC";}}
                        onMouseLeave={e=>{if(!isEditing&&!isExpanded)e.currentTarget.style.background="";}}>
                        {/* expand toggle */}
                        <td style={{...C,width:28,padding:"5px 4px",color:"#446BF9",textAlign:"center" as const}} onClick={e=>{e.stopPropagation();toggleExpand(l.id);}}>
                          <span style={{fontFamily:"Material Icons",fontSize:16,lineHeight:1,display:"block"}}>{isExpanded?"expand_less":"expand_more"}</span>
                        </td>
                        <td style={{...C,fontWeight:600,color:"#101828"}}>{l.item_no}</td>
                        <td style={{...C,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis"}}>{l.item_name}</td>
                        <td style={C}><UIn val={l.recipient??""} save={v=>sl(l.id,{recipient:v})} w={80}/></td>
                        <td style={C}><UIn val={l.notes??""} save={v=>sl(l.id,{notes:v})} w={60}/></td>
                        {/* REQUEST */}
                        <td style={CR}>{isEditing?<UIn val={String(units)} save={v=>sl(l.id,{quantity_requested:parseFloat(v)||0})} w={40} r/>:n(units,0)}</td>
                        <td style={CR}>{isEditing?<UIn val={String(ppu)} save={v=>sl(l.id,{pieces_per_unit:parseFloat(v)||0})} w={40} r/>:n(ppu,0)}</td>
                        <td style={CR}>{n(qty,2)}</td>
                        {/* PRE RESERVED */}
                        <td style={CB}></td>
                        <td style={CB}></td>
                        {/* ALLOCATED */}
                        {l.allocated_total_pieces > 0 ? (<>
                          <td style={CR}>{n(units,0)}</td>
                          <td style={CR}>{n(allocPcs,2)}</td>
                          <td style={CR}>{n(allocQty,2)}</td>
                          <td style={{...C,color:"#446BF9",fontSize:11}}>{l.allocated_from_po??""}</td>
                        </>) : (<>
                          <td colSpan={4} style={{...C,textAlign:"center" as const}} onClick={e=>e.stopPropagation()}>
                            <span
                              onClick={()=>{
                                setAllocateModal({
                                  lineId:l.id,
                                  itemName:l.item_name??l.item_no??"",
                                  requested:l.quantity_requested||0,
                                  ppu:l.pieces_per_unit||1,
                                });
                                setAllocateQty(String(l.quantity_requested||0));
                              }}
                              style={{color:"#446BF9",fontSize:11,fontWeight:600,cursor:"pointer",textDecoration:"underline",letterSpacing:".02em"}}>
                              Allocate Item
                            </span>
                          </td>
                        </>)}
                        {/* DIFFERENCE */}
                        <td style={CR}>{n(0,0)}</td>
                        <td style={CR}>{n(diffPcs,0)}</td>
                        <td style={diffQty<0?CRed:CR}>{n(diffQty,2)}</td>
                        {/* PRICE */}
                        <td style={CR}>
                          {isEditing
                            ? <UIn val={n(l.price,3)} save={v=>sl(l.id,{price:parseFloat(v)||0})} w={60} r/>
                            : <span style={{borderBottom:"1px solid #98A2B3",paddingBottom:1,cursor:"text"}}
                                onClick={()=>setEditingLine(l.id)}>{n(l.price,3)}</span>}
                        </td>
                        <td style={C}><USel val={l.price_unit??"Per kg"} opts={["Per kg","Per unit","Quanti…"]} save={v=>sl(l.id,{price_unit:v})} w={68}/></td>
                        {/* DISCOUNT */}
                        <td style={C}><UIn val={n(l.discount_value,3)} save={v=>sl(l.id,{discount_value:parseFloat(v)||0})} w={50} r/></td>
                        <td style={C}><USel val={l.discount_type||"Percent"} opts={["Percent","Value"]} save={v=>sl(l.id,{discount_type:v})} w={60}/></td>
                        {/* NET AMOUNT */}
                        <td style={{...CR,fontWeight:600,color:l.is_split?"#F59E0B":undefined}}>{n(netAmt,3)}</td>
                        <td style={{...C,padding:"5px 4px",position:"relative" as const}} onClick={e=>e.stopPropagation()}>
                          <span onClick={e=>{e.stopPropagation();setContextMenu(contextMenu?.lineId===l.id?null:{lineId:l.id,x:e.clientX,y:e.clientY});}}
                            style={{fontFamily:"Material Icons",fontSize:16,cursor:"pointer",color:"#98A2B3",lineHeight:1}}>more_vert</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{background:"#F2F4F7",fontWeight:700}}>
                    <td colSpan={5} style={C}></td>
                    <td style={CR}><b>{n(lines.reduce((s,l)=>s+(l.quantity_requested||0),0),0)}</b></td>
                    <td style={CR}></td>
                    <td style={CR}><b>{n(lines.reduce((s,l)=>(l.quantity_requested||0)*(l.pieces_per_unit||0)+s,0),2)}</b></td>
                    <td style={CB}></td><td style={CB}></td>
                    <td style={CR}><b>{n(lines.reduce((s,l)=>s+(l.quantity_requested||0),0),0)}</b></td>
                    <td style={CR}><b>{n(lines.reduce((s,l)=>s+(l.allocated_total_pieces||(l.quantity_requested||0)*(l.pieces_per_unit||0)),0),2)}</b></td>
                    <td style={CR}><b>{n(lines.reduce((s,l)=>s+(l.allocated_quantity||(l.quantity_requested||0)*(l.pieces_per_unit||0)),0),2)}</b></td>
                    <td style={CR}></td>
                    <td style={CR}>0</td>
                    <td style={CR}><b>{n(lines.reduce((s,l)=>{const q=(l.quantity_requested||0)*(l.pieces_per_unit||0);return s+(l.allocated_total_pieces||q)-q;},0),0)}</b></td>
                    <td style={CR}><b>{n(lines.reduce((s,l)=>{const q=(l.quantity_requested||0)*(l.pieces_per_unit||0);return s+(l.allocated_quantity||q)-q;},0),2)}</b></td>
                    <td style={CR}></td><td style={CR}></td>
                    <td style={CR}></td><td style={CR}></td>
                    <td style={{...CR,fontSize:12.5}}><b>{n(tot,3)}</b></td>
                    <td style={C}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ── Pallet / Unit table — standalone below lines ── */}
            {expandedLine && (()=>{
              const l = lines.find(x=>x.id===expandedLine);
              if(!l) return null;
              const lp = pallets[expandedLine]??[];
              const isLoading = palletsLoading===expandedLine;
              const ph:React.CSSProperties={fontSize:8.5,fontWeight:700,color:"#003160",textTransform:"uppercase" as const,letterSpacing:".05em",padding:"4px 8px",borderBottom:"1px solid #D0D5DD",whiteSpace:"nowrap" as const,background:"#EEF4FF",textAlign:"left" as const};
              const phR:React.CSSProperties={...ph,textAlign:"right" as const};
              const pd:React.CSSProperties={padding:"0 8px",height:"38px",fontSize:11.5,color:"#344054",borderBottom:"1px solid #F2F4F7",whiteSpace:"nowrap" as const,verticalAlign:"middle" as const};
              const pdR:React.CSSProperties={...pd,textAlign:"right" as const,fontFamily:"'Roboto Mono',monospace"};
              const pdB:React.CSSProperties={...pdR,color:"#446BF9"};
              return (
                <div style={{marginTop:20}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                    <span style={{width:3,height:16,background:"#446BF9",borderRadius:2,display:"inline-block"}}/>
                    <span style={{fontSize:10,fontWeight:700,color:"#003160",textTransform:"uppercase" as const,letterSpacing:".07em"}}>Pallets — {l.item_no} · {l.item_name}</span>
                    <button onClick={()=>setExpandedLine(null)} style={{marginLeft:"auto",border:"none",background:"none",cursor:"pointer",color:"#98A2B3",fontSize:13,lineHeight:1,fontFamily:"Material Icons"}}>close</button>
                  </div>
                  {isLoading && <div style={{padding:16,fontSize:12,color:"#98A2B3",background:"#fff",border:"1px solid #E4E7EC",borderRadius:2}}>Loading pallets…</div>}
                  {!isLoading && lp.length===0 && <div style={{padding:16,fontSize:12,color:"#98A2B3",background:"#fff",border:"1px solid #E4E7EC",borderRadius:2}}>No pallets found for this item.</div>}
                  {!isLoading && lp.length>0 && (()=>{
                    const expandedPallet = lp.find(p=>expandedUnits.has(p.id)) ?? null;
                    const visiblePallets = expandedPallet ? [expandedPallet] : lp;
                    return (
                    <div style={{background:"#fff",border:"1px solid #E4E7EC",borderRadius:2,overflow:"hidden"}}>
                      {/* "Show all pallets" button when one is expanded */}
                      {expandedPallet && (
                        <div style={{padding:"4px 8px",background:"#F8FAFC",borderBottom:"1px solid #E4E7EC",display:"flex",alignItems:"center",gap:6}}>
                          <button onClick={()=>setExpandedUnits(new Set())}
                            style={{display:"flex",alignItems:"center",gap:4,padding:"2px 8px",border:"1px solid #D0D5DD",borderRadius:2,background:"#fff",cursor:"pointer",fontSize:11,color:"#667085",fontFamily:"inherit"}}>
                            <span style={{fontFamily:"Material Icons",fontSize:13,color:"#667085"}}>unfold_more</span>
                            Show all pallets
                          </button>
                          <span style={{fontSize:11,color:"#98A2B3"}}>Showing pallet {expandedPallet.pallet_no}</span>
                        </div>
                      )}
                      <div style={{overflowX:"auto"}}>
                        <table style={{width:"100%",borderCollapse:"collapse"}}>
                          <thead>
                            <tr>
                              <th style={{...ph,width:28}}></th>
                              <th style={ph}>WAREHOUSE</th>
                              <th style={ph}>PALLET NO</th>
                              <th style={ph}>PO NO</th>
                              <th style={ph}>PACKING</th>
                              <th style={ph}>PACKED</th>
                              <th style={ph}>ORDER DATE</th>
                              <th style={phR}>VALUE PR WEIGHT</th>
                              <th style={{...phR,color:"#446BF9"}}>SALES PRICE</th>
                              <th style={{...phR,color:"#22C55E"}}>MARGIN %</th>
                              <th style={{...phR,color:"#22C55E"}}>MARGIN (KR)</th>
                              <th style={phR}>INVENTORY VALUE</th>
                              <th style={phR}>TOTAL (KG)</th>
                              <th style={phR}>RESERVED</th>
                              <th style={phR}>ALLOCATED</th>
                              <th style={phR}>AVAILABLE</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visiblePallets.map(p=>{
                              const isExpPallet = expandedUnits.has(p.id);
                              return (
                              <React.Fragment key={p.id}>
                                <tr onClick={()=>toggleUnits(p.id)}
                                  style={{cursor:"pointer",background:isExpPallet?"#EEF4FF":""}}
                                  onMouseEnter={e=>{if(!isExpPallet)e.currentTarget.style.background="#F8FAFC";}}
                                  onMouseLeave={e=>{if(!isExpPallet)e.currentTarget.style.background="";}}>
                                  <td style={{...pd,width:28,color:"#446BF9",textAlign:"center" as const}}>
                                    <span style={{fontFamily:"Material Icons",fontSize:15,lineHeight:1}}>{isExpPallet?"expand_less":"expand_more"}</span>
                                  </td>
                                  <td style={pd}>{p.warehouse}</td>
                                  <td style={{...pd,color:"#446BF9",fontWeight:600}}>{p.pallet_no}</td>
                                  <td style={pd}>{p.po_no??""}</td>
                                  <td style={pd}>{p.packing??""}</td>
                                  <td style={pd}>{fD(p.packed_date)}</td>
                                  <td style={pd}>{fD(p.order_date)}</td>
                                  <td style={pdR}>{p.value_pr_weight.toFixed(3)}</td>
                                  <td style={{...pdR,color:"#446BF9",position:"relative" as const}} onClick={e=>e.stopPropagation()}>
                                    <PriceInput
                                      val={p.sales_price ?? linePrices[expandedLine!] ?? p.value_pr_weight}
                                      original={linePrices[expandedLine!] ?? p.value_pr_weight}
                                      pending={p.pallet_units.every(u=>pendingPrices[u.id]!==undefined)
                                        ? pendingPrices[p.pallet_units[0]?.id]
                                        : undefined}
                                      onStage={newPrice=>stagePriceForPallet(p.pallet_units, newPrice)}
                                      tabIndex={1000 + visiblePallets.indexOf(p)}
                                    />
                                  </td>
                                  <td style={{...pdR,color:"#22C55E"}}>
                                    {p.sales_price
                                      ? ((p.sales_price - p.value_pr_weight) / p.sales_price * 100).toFixed(1) + "%"
                                      : "—"}
                                  </td>
                                  <td style={{...pdR,color:"#22C55E"}}>
                                    {p.sales_price
                                      ? ((p.sales_price - p.value_pr_weight) * p.total_kg).toFixed(2)
                                      : "—"}
                                  </td>
                                  <td style={pdR}>{p.inventory_value.toFixed(3)}</td>
                                  <td style={pdR}>{p.total_kg.toFixed(2)}</td>
                                  <td style={pdR}>{p.reserved_kg.toFixed(2)}</td>
                                  <td style={pdB}>{p.allocated_kg.toFixed(2)}</td>
                                  <td style={pdR}>{p.available_kg.toFixed(2)}</td>
                                </tr>
                                {isExpPallet && (
                                  <tr>
                                    <td colSpan={16} style={{padding:0,background:"#F8FAFC"}}>
                                      <div style={{borderTop:"1px solid #E4E7EC",marginTop:20}}>
                                        <div style={{padding:"6px 8px",background:"#F2F4F7",borderBottom:"1px solid #E4E7EC",display:"flex",alignItems:"center",gap:6}}>
                                          <span style={{width:3,height:14,background:"#98A2B3",borderRadius:2,display:"inline-block"}}/>
                                          <span style={{fontSize:9,fontWeight:700,color:"#667085",textTransform:"uppercase" as const,letterSpacing:".07em"}}>Units — {p.pallet_no}</span>
                                        </div>
                                        <table style={{width:"100%",borderCollapse:"collapse"}}>
                                          <thead>
                                            <tr style={{background:"#F2F4F7"}}>
                                              {["PACKING PLANT","UNIT NO","PO NO","LANDING NO","PACKED","ORIGINAL ETA","USE BY","RESERVED TO SO"].map(h=>(
                                                <th key={h} style={{...ph,background:"#F2F4F7",color:"#667085"}}>{h}</th>
                                              ))}
                                              <th style={{...phR,background:"#F2F4F7",color:"#667085"}}>VALUE PR WEIGHT</th>
                                              <th style={{...phR,background:"#F2F4F7",color:"#446BF9"}}>SALES PRICE</th>
                                              <th style={{...phR,background:"#F2F4F7",color:"#22C55E"}}>MARGIN %</th>
                                              <th style={{...phR,background:"#F2F4F7",color:"#22C55E"}}>MARGIN (KR)</th>
                                              {["INVENTORY VALUE","TOTAL (KG)","RESERVED","ALLOCATED","AVAILABLE"].map(h=>(
                                                <th key={h} style={{...phR,background:"#F2F4F7",color:"#667085"}}>{h}</th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {p.pallet_units.map(u=>(
                                              <tr key={u.id}
                                                style={{background:pendingPrices[u.id]!==undefined?"#FFFBEB":""}}
                                                onMouseEnter={e=>e.currentTarget.style.background=pendingPrices[u.id]!==undefined?"#FEF3C7":"#F0F5FF"}
                                                onMouseLeave={e=>e.currentTarget.style.background=pendingPrices[u.id]!==undefined?"#FFFBEB":""}>
                                                <td style={pd}>{u.packing_plant??""}</td>
                                                <td style={{...pd,color:"#446BF9",fontWeight:600}}>{u.unit_no}</td>
                                                <td style={pd}>{u.po_no??""}</td>
                                                <td style={pd}>{u.landing_no??""}</td>
                                                <td style={pd}>{fD(u.packed_date)}</td>
                                                <td style={pd}>{fD(u.original_eta)}</td>
                                                <td style={pd}>{fD(u.use_by_date)}</td>
                                                <td style={{...pd,color:u.reserved_to_so?"#003160":"#98A2B3",fontWeight:u.reserved_to_so?600:400}}>{u.reserved_to_so??""}</td>
                                                <td style={pdR}>{u.value_pr_weight.toFixed(3)}</td>
                                                <td style={{...pdR,color:"#446BF9",position:"relative" as const}} onClick={e=>e.stopPropagation()}>
                                                  <PriceInput
                                                    val={u.sales_price ?? linePrices[expandedLine!] ?? u.value_pr_weight}
                                                    original={linePrices[expandedLine!] ?? u.value_pr_weight}
                                                    pending={pendingPrices[u.id]}
                                                    onStage={newPrice=>stagePriceForUnit(u.id, newPrice, u.sales_price ?? linePrices[expandedLine!] ?? u.value_pr_weight)}
                                                    tabIndex={2000 + p.pallet_units.indexOf(u)}
                                                  />
                                                </td>
                                                <td style={{...pdR,color:"#22C55E"}}>
                                                  {(u.sales_price??linePrices[expandedLine!])
                                                    ? (((u.sales_price??linePrices[expandedLine!])! - u.value_pr_weight) / (u.sales_price??linePrices[expandedLine!])! * 100).toFixed(1) + "%"
                                                    : "—"}
                                                </td>
                                                <td style={{...pdR,color:"#22C55E"}}>
                                                  {(u.sales_price??linePrices[expandedLine!])
                                                    ? (((u.sales_price??linePrices[expandedLine!])! - u.value_pr_weight) * u.total_kg).toFixed(2)
                                                    : "—"}
                                                </td>
                                                <td style={pdR}>{u.inventory_value.toFixed(3)}</td>
                                                <td style={pdR}>{u.total_kg.toFixed(2)}</td>
                                                <td style={pdR}>{u.reserved_kg.toFixed(2)}</td>
                                                <td style={pdB}>{u.allocated_kg.toFixed(2)}</td>
                                                <td style={pdR}>{u.available_kg.toFixed(2)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* ── Cost table ── */}
            <div style={{marginTop:20,border:"1px solid #E4E7EC",borderRadius:2,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr>
                    <th colSpan={5} style={{...G,paddingTop:8}}>COST</th>
                    <th colSpan={4} style={{...G,paddingTop:8,textAlign:"right" as const}}>QUANTITY</th>
                    <th colSpan={3} style={{...G,paddingTop:8,textAlign:"right" as const}}>AMOUNT</th>
                  </tr>
                  <tr>
                    <th style={HL}>COST</th>
                    <th style={HL}>INCLUDED</th>
                    <th style={HL}>DESCRIPTION</th>
                    <th style={HL}>CALCULATION METHOD</th>
                    <th style={HL}>DISTRIBUTION METHOD</th>
                    <th style={H}>NO OF UNITS</th>
                    <th style={H}>GROSS WEIGHT</th>
                    <th style={H}>NET WEIGHT</th>
                    <th style={H}>PRICE</th>
                    <th style={H}>TOTAL AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={10} style={{...C,color:"#98A2B3",textAlign:"center" as const}}>
                      <span onClick={()=>{}} style={{fontFamily:"Material Icons",fontSize:20,color:"#446BF9",cursor:"pointer",verticalAlign:"middle",marginRight:6}}>add_circle</span>
                      {costs.length===0?"No costs added":""}
                    </td>
                  </tr>
                  {costs.map(c=>(
                    <tr key={c.id} onMouseEnter={e=>e.currentTarget.style.background="#F8FAFC"} onMouseLeave={e=>e.currentTarget.style.background=""}>
                      <td style={C}>{c.cost??""}</td>
                      <td style={C}>{c.included?"Yes":"No"}</td>
                      <td style={C}>{c.description??""}</td>
                      <td style={C}>{c.calculation_method??""}</td>
                      <td style={C}>{c.distribution_method??""}</td>
                      <td style={CR}>{n(c.no_of_units,0)}</td>
                      <td style={CR}>{n(c.gross_weight,2)}</td>
                      <td style={CR}>{n(c.net_weight,2)}</td>
                      <td style={CR}>{n(c.price,3)}</td>
                      <td style={CR}>{n(c.total_amount,3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Discount row ── */}
            <div style={{marginTop:16,border:"1px solid #E4E7EC",borderRadius:2,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr>
                    <th style={HL}>TYPE</th>
                    <th style={H}>AMOUNT</th>
                    <th style={H}>DISCOUNT</th>
                    <th style={H}>CALCULATION METHOD</th>
                    <th style={H}>TOTAL AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={C}>General Order Discount</td>
                    <td style={CR}>{n(tot,3)}</td>
                    <td style={CR}><UIn val="0.000" save={()=>{}} w={60} r/></td>
                    <td style={C}>
                      <select style={{border:"none",borderBottom:"1px solid #98A2B3",padding:"3px 0",fontSize:11,color:"#344054",cursor:"pointer",background:"transparent"}}>
                        <option>Value</option>
                        <option>Percent</option>
                      </select>
                    </td>
                    <td style={{...CR,fontWeight:700}}>{n(tot,3)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ── Grand total ── */}
            <div style={{display:"flex",justifyContent:"flex-end",padding:"12px 0 0",borderTop:"2px solid #003160",marginTop:8}}>
              <span style={{fontSize:13,fontWeight:700,color:"#003160",fontFamily:"'Roboto Mono',monospace"}}>{n(tot,3)}</span>
            </div>
          </>
        ) : (
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200,color:"#98A2B3",fontSize:13}}>{tab} — coming soon</div>
        )}
      </div>
    </div>

    {/* ── Fixed Apply bar — shown when pending price changes exist ── */}
    {Object.keys(pendingPrices).length > 0 && (
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:300,background:"#003160",padding:"12px 24px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 -4px 20px rgba(0,0,0,0.2)"}}>
        <span style={{fontFamily:"Material Icons",fontSize:20,color:"#F59E0B"}}>edit_note</span>
        <div>
          <div style={{fontSize:12.5,color:"#fff",fontWeight:700}}>
            {Object.keys(pendingPrices).length} unit{Object.keys(pendingPrices).length>1?"s":""} with staged price changes
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>
            Will be split into {[...new Set(Object.values(pendingPrices))].length} price group{[...new Set(Object.values(pendingPrices))].length>1?"s":""}
          </div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:10}}>
          <button onClick={()=>setPendingPrices({})}
            style={{padding:"8px 16px",border:"1px solid rgba(255,255,255,0.3)",borderRadius:2,background:"transparent",cursor:"pointer",fontSize:12,color:"#fff",fontFamily:"inherit"}}>
            Discard all
          </button>
          <button onClick={()=>applyChanges(expandedLine!)} disabled={applying}
            style={{padding:"8px 20px",border:"none",borderRadius:2,background:applying?"#667085":"#F59E0B",color:applying?"#fff":"#003160",cursor:applying?"not-allowed":"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
            {applying
              ? <><span style={{fontFamily:"Material Icons",fontSize:15,lineHeight:1}}>hourglass_empty</span>Applying…</>
              : <><span style={{fontFamily:"Material Icons",fontSize:15,lineHeight:1}}>check</span>Apply & split</>}
          </button>
        </div>
      </div>
    )}

    {/* ── Split error toast ── */}
    {splitError && (
      <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#EF4444",color:"#fff",padding:"10px 20px",borderRadius:4,fontSize:12.5,zIndex:300,display:"flex",alignItems:"center",gap:10,boxShadow:"0 4px 16px rgba(0,0,0,0.2)"}}>
        <span style={{fontFamily:"Material Icons",fontSize:16}}>error_outline</span>
        {splitError}
        <button onClick={()=>setSplitError(null)} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",fontFamily:"Material Icons",fontSize:16,lineHeight:1}}>close</button>
      </div>
    )}

    {/* ── Allocate Item modal ── */}
    {allocateModal && (
      <>
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:400}} onClick={()=>{setAllocateModal(null);setAllocateQty("");}}/>
        <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:401,background:"#fff",borderRadius:4,boxShadow:"0 8px 40px rgba(0,0,0,0.18)",width:420,overflow:"hidden"}}>
          {/* Modal header */}
          <div style={{background:"#003160",padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:13,fontWeight:700,color:"#fff",letterSpacing:".04em"}}>ALLOCATE ITEM</span>
            <button onClick={()=>{setAllocateModal(null);setAllocateQty("");}} style={{border:"none",background:"none",cursor:"pointer",color:"rgba(255,255,255,0.7)",fontFamily:"Material Icons",fontSize:18,lineHeight:1}}>close</button>
          </div>
          {/* Item info */}
          <div style={{padding:"16px 20px 0",borderBottom:"1px solid #F2F4F7",paddingBottom:16}}>
            <div style={{fontSize:11,color:"#98A2B3",fontWeight:700,textTransform:"uppercase" as const,letterSpacing:".06em",marginBottom:4}}>Item</div>
            <div style={{fontSize:13,fontWeight:600,color:"#101828"}}>{allocateModal.itemName}</div>
          </div>
          {/* Stats row */}
          <div style={{display:"flex",borderBottom:"1px solid #F2F4F7"}}>
            <div style={{flex:1,padding:"14px 20px",borderRight:"1px solid #F2F4F7"}}>
              <div style={{fontSize:10,color:"#98A2B3",fontWeight:700,textTransform:"uppercase" as const,letterSpacing:".06em",marginBottom:4}}>Requested</div>
              <div style={{fontSize:20,fontWeight:700,color:"#101828",fontFamily:"'Roboto Mono',monospace"}}>{allocateModal.requested}</div>
              <div style={{fontSize:10,color:"#98A2B3",marginTop:2}}>units ({allocateModal.requested * allocateModal.ppu} pcs)</div>
            </div>
            <div style={{flex:1,padding:"14px 20px"}}>
              <div style={{fontSize:10,color:"#98A2B3",fontWeight:700,textTransform:"uppercase" as const,letterSpacing:".06em",marginBottom:4}}>Allocate</div>
              <input
                type="number"
                value={allocateQty}
                min={1}
                onChange={e=>setAllocateQty(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")allocateItem();}}
                autoFocus
                style={{width:"100%",fontSize:20,fontWeight:700,color:"#446BF9",fontFamily:"'Roboto Mono',monospace",border:"none",borderBottom:"2px solid #446BF9",outline:"none",background:"transparent",padding:"0 0 2px"}}
              />
              <div style={{fontSize:10,color:"#98A2B3",marginTop:2}}>
                units ({parseInt(allocateQty)||0} × {allocateModal.ppu} = {(parseInt(allocateQty)||0)*allocateModal.ppu} pcs)
              </div>
            </div>
          </div>
          {/* Diff indicator */}
          {allocateQty && parseInt(allocateQty) !== allocateModal.requested && (
            <div style={{padding:"10px 20px",background:parseInt(allocateQty)>allocateModal.requested?"#F0FDF4":"#FFF7ED",borderBottom:"1px solid #F2F4F7",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontFamily:"Material Icons",fontSize:16,color:parseInt(allocateQty)>allocateModal.requested?"#22C55E":"#F59E0B"}}>
                {parseInt(allocateQty)>allocateModal.requested?"arrow_upward":"arrow_downward"}
              </span>
              <span style={{fontSize:12,color:parseInt(allocateQty)>allocateModal.requested?"#16A34A":"#D97706",fontWeight:600}}>
                {parseInt(allocateQty)>allocateModal.requested?"Over":"Under"}-allocation by {Math.abs((parseInt(allocateQty)||0)-allocateModal.requested)} units
              </span>
            </div>
          )}
          {/* Actions */}
          <div style={{padding:"16px 20px",display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button onClick={()=>{setAllocateModal(null);setAllocateQty("");}}
              style={{padding:"8px 18px",border:"1px solid #D0D5DD",borderRadius:2,background:"#fff",cursor:"pointer",fontSize:12,fontWeight:600,color:"#344054",fontFamily:"inherit"}}>
              Cancel
            </button>
            <button onClick={allocateItem} disabled={allocating||!allocateQty||parseInt(allocateQty)<=0}
              style={{padding:"8px 22px",border:"none",borderRadius:2,background:allocating?"#98A2B3":"#003160",color:"#fff",cursor:allocating?"not-allowed":"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
              {allocating
                ? <><span style={{fontFamily:"Material Icons",fontSize:14,lineHeight:1}}>hourglass_empty</span>Allocating…</>
                : <><span style={{fontFamily:"Material Icons",fontSize:14,lineHeight:1}}>check</span>Allocate {allocateQty} units</>}
            </button>
          </div>
        </div>
      </>
    )}

    {/* ── Context menu ── */}
    {contextMenu && (
      <>
        <div style={{position:"fixed",inset:0,zIndex:200}} onClick={()=>setContextMenu(null)}/>
        <div style={{position:"fixed",top:contextMenu.y,right:`calc(100vw - ${contextMenu.x}px)`,zIndex:201,background:"#fff",border:"1px solid #E4E7EC",borderRadius:3,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",minWidth:200,overflow:"hidden"}}>
          {lines.find(l=>l.id===contextMenu.lineId)?.is_split && (
            <button onClick={()=>revertLine(contextMenu.lineId)}
              style={{width:"100%",padding:"9px 14px",border:"none",background:"none",cursor:"pointer",textAlign:"left" as const,fontSize:12.5,color:"#003160",display:"flex",alignItems:"center",gap:8,fontFamily:"inherit"}}
              onMouseEnter={e=>e.currentTarget.style.background="#F2F4F7"}
              onMouseLeave={e=>e.currentTarget.style.background=""}>
              <span style={{fontFamily:"Material Icons",fontSize:15,color:"#446BF9"}}>undo</span>
              Revert to original price
            </button>
          )}
          <button onClick={()=>{deleteLine(contextMenu.lineId);setContextMenu(null);}}
            style={{width:"100%",padding:"9px 14px",border:"none",background:"none",cursor:"pointer",textAlign:"left" as const,fontSize:12.5,color:"#EF4444",display:"flex",alignItems:"center",gap:8,fontFamily:"inherit"}}
            onMouseEnter={e=>e.currentTarget.style.background="#FEF2F2"}
            onMouseLeave={e=>e.currentTarget.style.background=""}>
            <span style={{fontFamily:"Material Icons",fontSize:15,color:"#EF4444"}}>delete_outline</span>
            Remove line
          </button>
        </div>
      </>
    )}
    </SalesShell>
  );
}