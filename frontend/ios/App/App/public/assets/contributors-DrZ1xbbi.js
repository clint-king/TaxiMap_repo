import{B as c}from"./AddressSelection-CWIIN_Gi.js";class u{constructor(){this.contributors=[],this.init()}async init(){await this.loadContributors(),this.renderContributors()}async loadContributors(){try{const t=await fetch(`${c}/admin/contributors`);if(t.ok){const e=await t.json();this.contributors=e.contributors||[]}else console.error("Failed to load contributors"),this.contributors=[]}catch(t){console.error("Error loading contributors:",t),this.contributors=[]}}renderContributors(){const t=document.querySelector(".contributors-grid");t&&(t.innerHTML="",this.contributors.forEach((e,o)=>{const n=this.createContributorCard(e,o);t.appendChild(n)}))}createContributorCard(t,e){const o=document.createElement("div");o.className="contributor-card bg-white rounded-lg shadow-lg p-6 transition duration-300";const n=t.name.split(" ").map(a=>a[0]).join("").toUpperCase(),r=["bg-primary text-black","bg-blue-100 text-blue-600","bg-green-100 text-green-600","bg-amber-100 text-amber-600","bg-red-100 text-red-600","bg-teal-100 text-teal-600","bg-indigo-100 text-indigo-600","bg-purple-100 text-purple-600"],s=r[e%r.length],i=s.replace("bg-","bg-").replace("text-","text-");return o.innerHTML=`
      <div class="flex items-center mb-4">
        <div class="w-16 h-16 ${s} rounded-full flex items-center justify-center font-bold text-xl">
          ${n}
        </div>
        <div class="ml-4">
          <h3 class="font-bold">${t.name}</h3>
          <span class="text-sm text-gray-500">${t.region||"Route Contributor"}</span>
        </div>
      </div>
      <p class="text-gray-600 mb-4">
        ${this.getContributorDescription(t)}
      </p>
      <div class="flex justify-between items-center">
        <span class="${i} text-xs font-semibold px-3 py-1 rounded-full">
          ${this.getContributorBadge(t)}
        </span>
        <span class="text-xs text-gray-500">${this.formatDate(t.created_at)}</span>
      </div>
    `,o}getContributorDescription(t){return t.routes_contributed>0?`Contributed ${t.routes_contributed} route${t.routes_contributed>1?"s":""} to our database, helping improve navigation for thousands of commuters.`:"Active community member helping to map and improve taxi routes across South Africa."}getContributorBadge(t){const e=t.routes_contributed;return e>=40?"Top Contributor":e>=30?"Route Expert":e>=20?"Community Leader":e>=10?"Data Specialist":e>=5?"Regional Expert":"New Contributor"}formatDate(t){if(!t)return"Recently";const e=new Date(t),n=Math.abs(new Date-e),r=Math.ceil(n/(1e3*60*60*24));if(r===1)return"Since yesterday";if(r<30)return`Since ${r} days ago`;if(r<365){const i=Math.floor(r/30);return`Since ${i} month${i>1?"s":""} ago`}const s=Math.floor(r/365);return`Since ${s} year${s>1?"s":""} ago`}}document.addEventListener("DOMContentLoaded",()=>{new u});
