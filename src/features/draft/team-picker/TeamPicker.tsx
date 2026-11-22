import { useState } from 'react'
import './team-picker.css'
import type { Hero } from '../../../shared/types/domains'
interface TeamPickerProps { title:string; selected:string[]; other:string[]; names:string[]; limit:number; onChange:(names:string[])=>void; enemy?:boolean; heroes?:Hero[] }
const imageFor=(name:string)=>`https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${name.toLowerCase().replace(/[^a-z0-9]+/g,'_')}.png`
const groups=[['strength','Сила'],['agility','Ловкость'],['intelligence','Интеллект'],['universal','Универсальный'],['unknown','Атрибут неизвестен']]
export function TeamPicker({title,selected,other,names,limit,onChange,enemy,heroes=[]}:TeamPickerProps){
 const [search,setSearch]=useState(''); const filtered=names.filter(n=>n.toLowerCase().includes(search.trim().toLowerCase()))
 return <div><label>{title} <span>{selected.length} / {limit}</span></label><div className="slots">{selected.length?selected.map(n=><button key={n} type="button" className={'chip '+(enemy?'enemy':'')} onClick={()=>onChange(selected.filter(x=>x!==n))}>{n} ×</button>):<span className="placeholder">Пока никого</span>}</div><div className="hero-search"><input aria-label={`Поиск героя: ${title}`} placeholder="Поиск героя..." value={search} onChange={e=>setSearch(e.target.value)}/><div className="hero-categories">{groups.map(([key,label])=>{const group=filtered.filter(n=>(heroes.find(h=>h.name===n)?.attribute||'unknown')===key); if(!group.length)return null; return <section key={key}><h4>{label}</h4><div className="hero-grid">{group.map(n=>{const picked=selected.includes(n); const disabled=other.includes(n)||(!picked&&selected.length>=limit); return <button key={n} type="button" className={`hero-tile ${picked?'selected':''} ${enemy?'enemy':''}`} disabled={disabled} onClick={()=>onChange(picked?selected.filter(x=>x!==n):[...selected,n])} aria-pressed={picked}><img src={heroes.find(h=>h.name===n)?.image || imageFor(n)} alt=""/><span>{n}</span></button>})}</div></section>})}</div></div></div>
}


