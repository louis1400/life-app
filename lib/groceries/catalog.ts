import type { Product } from "./model";

export const PRICE_CHECKED_ON="2026-09-07";
const product=(id:string,name:string,shortName:string,pack:string,category:string,priceCents:number,slug:string,mode:"cycle"|"usage"="cycle"):Product=>({id,name,shortName,pack,category,priceCents,url:`https://www.ah.nl/producten/product/${id}/${slug}`,image:`/products/${id}.webp`,mode});
export const PRODUCTS:Product[]=[
  product("wi505041","AH Tissues extra zacht & sterk 4 lagen","Tissues","80 tissues","Paper essentials",159,"ah-tissues-extra-zacht-en-sterk-4-lagen"),
  product("wi584467","AH Keukenpapier extra sterk 3=4 rollen","Kitchen roll","3 rolls · 300 sheets","Paper essentials",295,"ah-keukenpapier-extra-sterk-3=4-rollen"),
  product("wi595094","AH Toiletpapier zacht 4-laags 12=18 rollen","Toilet paper","12 rolls · 4-ply","Paper essentials",799,"ah-toiletpapier-zacht-4-laags-12=18-rollen"),
  product("wi82822","Tempo Complete care 4-laags zakdoeken","Pocket tissues","10 pocket packs × 9 tissues","Paper essentials",339,"tempo-complete-care-4-laags-zakdoeken"),
  product("wi505039","AH Toiletreiniger oceaan","Toilet cleaner","1 litre · Ocean","Home & laundry",95,"ah-toiletreiniger-oceaan"),
  product("wi470849","AH Afwasmiddel citrus","Washing-up liquid","1 litre · Citrus","Home & laundry",99,"ah-afwasmiddel-citrus"),
  product("wi570818","AH Wasmiddel kleur navulling","Laundry detergent","Refill · 50 washes","Home & laundry",445,"ah-wasmiddel-kleur-navulling"),
  product("wi583332","AH Wasverzachter geconcentreerd fris","Fabric softener","1.44 litres · 80 washes","Home & laundry",229,"ah-wasverzachter-geconcentreerd-fris"),
  product("wi594759","Sanex Derma care+ extra control roller","Deodorant","53 ml · Extra control","Personal care",489,"sanex-derma-care-extra-control-roller"),
  product("wi553088","Sanex Expert skin health protector douchegel","Shower gel","400 ml · Skin protector","Personal care",649,"sanex-expert-skin-health-protector-douchegel"),
  product("wi568399","Powerade Mountain blast 12-pack","Powerade","12 bottles × 500 ml","Drinks & cupboard",2025,"powerade-mountain-blast-12-pack"),
  product("wi448008","Smint Peppermint","Peppermint mints","150 mints · 105 g","Drinks & cupboard",599,"smint-peppermint"),
  product("wi472868","Yum Yum Thai coconut soup","Coconut noodle soup","1 packet · 100 g","Drinks & cupboard",129,"yum-yum-thai-coconut-soup","usage"),
];
