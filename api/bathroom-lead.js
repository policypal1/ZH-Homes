"use strict";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzikh0E8I1FoKLisU_1B6QLk_jp6TGP6yMSVKWV-pCQJ1HxNHrAqsg88gO2uS60tIP4/exec";
module.exports = async function handler(req,res){
 const started=Date.now();res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'method_not_allowed'});}
 let p;try{p=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{return res.status(400).json({ok:false,error:'invalid_json'});}
 if(!p||typeof p!=='object'||Array.isArray(p))return res.status(400).json({ok:false,error:'invalid_payload'});
 const str=x=>typeof x==='string'?x.trim():'';
 const phoneDigits=str(p.phone).replace(/\D/g,'');
 if(JSON.stringify(p).length>20000||str(p.companyWebsite)||!str(p.fullName)||str(p.fullName).length>120||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(p.email))||str(p.email).length>254||phoneDigits.length<10||phoneDigits.length>15||(str(p.zipCode)&&!/^\d{5}(-\d{4})?$/.test(str(p.zipCode))))return res.status(400).json({ok:false,error:'invalid_lead'});
 try{
  const begin=Date.now();
  const response=await fetch(APPS_SCRIPT_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(p),redirect:'follow',signal:AbortSignal.timeout(25000)});
  const output=(await response.text()).trim().toLowerCase();
  const duration=Date.now()-begin;res.setHeader('Server-Timing','apps_script;dur='+duration);
  const confirmed=output==='ok'||output==='{"ok":true}'||output.includes('"ok":true');
  if(!response.ok||!confirmed){console.error('Unconfirmed lead',{status:response.status,upstream_ms:duration});return res.status(502).json({ok:false,error:'lead_delivery_unconfirmed'});}
  console.info('Lead delivered',{upstream_ms:duration,total_ms:Date.now()-started});
  return res.status(200).json({ok:true});
 }catch(error){const timeout=error?.name==='TimeoutError'||error?.name==='AbortError';console.error('Lead delivery error',{timeout,duration_ms:Date.now()-started});return res.status(timeout?504:502).json({ok:false,error:timeout?'lead_delivery_timeout':'lead_delivery_unconfirmed'});}
};
