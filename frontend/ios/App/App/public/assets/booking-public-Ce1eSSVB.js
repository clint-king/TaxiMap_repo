import"./AddressSelection-CWIIN_Gi.js";/* empty css               *//* empty css                 *//* empty css                *//* empty css                        */import"./tonav-BKPMnGmg.js";import{i as Ue,e as Ve,j as We}from"./paymentApi-B8IjspkC.js";import"./logout-DBLdyFVo.js";import"./axios-D4YhIzwJ.js";const Ge=!0;let B=null,r=null,$=1,E=0,_=1,j="",L="passengers",Q=null,de=null,pe=null,re=null,F=[],z=[],Qe=1,Ze=1,v={},R={senderName:"",senderPhone:""},K={receiverName:"",receiverPhone:""};function H(e){if(e==null)return"";if(typeof e=="string"){const o=e.trim();if(o.length===0)return"";const t=o.toLowerCase();return t==="null"||t==="undefined"?"":o}return e}function Y(e){return e==null?"":String(e).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}const M={"pta-tzn":{name:"Pretoria → Tzaneen",distance:450,duration:5.5,price:450,capacity:20,occupied:6,departure:"2025/11/14 Friday 10:00 am",extraSpace:{large:1,medium:3,small:10,totalCapacity:20,usedLarge:0,usedMedium:0,usedSmall:0},coordinates:{start:[28.2294,-25.7479],end:[30.1403,-23.8336]}},"tzn-pta":{name:"Tzaneen → Pretoria",distance:450,duration:5.5,price:450,capacity:20,occupied:6,departure:"2025/11/14 Friday 10:00 am",extraSpace:{large:1,medium:3,small:10,totalCapacity:20,usedLarge:0,usedMedium:0,usedSmall:0},coordinates:{start:[30.1403,-23.8336],end:[28.2294,-25.7479]}}},U={large:400,medium:150,small:60};function Xe(e){if(e===0)return"No extra space available";const o=Math.floor(e/4),t=Math.floor(e/2),i=[];return o>0&&i.push(`${o} large`),t>0&&i.push(`${t} medium`),i.push(`${e} small`),o>0?`${o} large (or ${i.join(" or ")})`:t>0?`${t} medium (or ${i.join(" or ")})`:`${e} small`}function me(e){if(!e)return"To be confirmed";const o=new Date(e),t=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],i=o.getFullYear(),a=String(o.getMonth()+1).padStart(2,"0"),s=String(o.getDate()).padStart(2,"0"),n=t[o.getDay()];return`${i}/${a}/${s} ${n}`}function ue(e){if(!e)return"To be confirmed";const o=new Date(e);let t=o.getHours();const i=String(o.getMinutes()).padStart(2,"0"),a=t>=12?"pm":"am";return t=t%12,t=t||12,`${t}:${i} ${a}`}async function et(){const e=document.querySelector(".route-selection");if(!e){console.warn("Route selection container not found");return}e.innerHTML="";try{const o=await Ue();if(!o.success||!o.bookings||o.bookings.length===0){const a=document.querySelector(".route-selection"),s=e.previousElementSibling;a&&(a.style.display="none"),s&&s.tagName==="H2"&&s.textContent.includes("Available Routes")&&(s.style.display="none");return}const t=document.querySelector(".route-selection"),i=e.previousElementSibling;t&&(t.style.display=""),i&&i.tagName==="H2"&&i.textContent.includes("Available Routes")&&(i.style.display=""),window.pendingBookings=o.bookings,o.bookings.forEach(a=>{let s="";a.direction_type==="from_loc1"?s=`${a.location_1} → ${a.location_2}`:a.direction_type==="from_loc2"?s=`${a.location_2} → ${a.location_1}`:s=`${a.location_1} → ${a.location_2}`;const n=me(a.scheduled_pickup),c=ue(a.scheduled_pickup),p=Xe(a.extraspace_parcel_count_sp||0),u=`booking-${a.ID}`,f=`
                <div class="route-card" data-route="${u}" data-booking-id="${a.ID}" onclick="selectRoute('${u}')">
                    <div class="route-info">
                        <div class="route-details">
                            <h3><i class="ri-taxi-line"></i>${Y(s)}</h3>
                            <p><i class="ri-time-line"></i><strong>Duration:</strong> ~${a.typical_duration_hours} hours</p>
                            <p><i class="ri-calendar-line"></i><strong>Date:</strong> ${Y(n)}</p>
                            <p><i class="ri-time-line"></i><strong>Time:</strong> ${Y(c)}</p>
                            <p><i class="ri-user-line"></i><strong>Capacity:</strong> ${a.total_seats_available} seat${a.total_seats_available!==1?"s":""} available</p>
                            <p id="extra-space-${u}" style="background: #f3e5f5; padding: 0.75rem; border-radius: 8px; margin-top: 0.5rem;">
                                <i class="ri-box-3-line" style="color: #7b1fa2;"></i>
                                <strong style="color: #7b1fa2;">Available Extra Space:</strong> 
                                <span id="extra-space-display-${u}">${Y(p)}</span>
                            </p>
                        </div>
                        <div class="route-price">R${parseFloat(a.base_fare).toFixed(2)}</div>
                        <div class="extra-space-pricing" style="margin-top: 1rem; padding: 1rem; background: #fff9e6; border: 2px solid #FFD52F; border-radius: 10px;">
                            <div style="font-size: 0.85rem; color: #666; margin-bottom: 0.5rem; font-weight: 600;">
                                <i class="ri-price-tag-3-line" style="color: #FFD52F;"></i> Extra Space Pricing:
                            </div> 
                            <div style="display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.9rem;">
                                <div style="display: flex; justify-content: space-between;">
                                    <span><strong>Large:</strong></span>
                                    <span style="color: #01386A; font-weight: 700;">R${parseFloat(a.large_parcel_price).toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span><strong>Medium:</strong></span>
                                    <span style="color: #01386A; font-weight: 700;">R${parseFloat(a.medium_parcel_price).toFixed(2)}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span><strong>Small:</strong></span>
                                    <span style="color: #01386A; font-weight: 700;">R${parseFloat(a.small_parcel_price).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;e.insertAdjacentHTML("beforeend",f)})}catch(o){console.error("Error loading pending bookings:",o);const t=document.querySelector(".route-selection"),i=e.previousElementSibling;t&&(t.style.display="none"),i&&i.tagName==="H2"&&i.textContent.includes("Available Routes")&&(i.style.display="none")}}function Be(){if(typeof google>"u"||!google.maps){setTimeout(Be,100);return}const e=document.getElementById("route-map");e&&setTimeout(()=>{e.style.width="100%",e.style.height="100%",e.style.display="block",Q=new google.maps.Map(e,{center:{lat:-24.791,lng:29.185},zoom:7,mapTypeControl:!0,streetViewControl:!1,fullscreenControl:!0}),setTimeout(()=>{Q&&(google.maps.event.trigger(Q,"resize"),De())},300)},100)}const G={Pretoria:{bounds:{north:-25.6,south:-25.9,east:28.4,west:28},center:{lat:-25.7479,lng:28.2294},name:"Pretoria"},Tzaneen:{bounds:{north:-23.7,south:-24,east:30.4,west:29.9},center:{lat:-23.8336,lng:30.1403},name:"Tzaneen"}};let O=null,oe=null,ne=null,Ce=null;function Te(){if(!B)return;let e,o;if(r)r.direction_type==="from_loc1"?(e=r.location_1,o=r.location_2):r.direction_type==="from_loc2"?(e=r.location_2,o=r.location_1):(e=r.location_1,o=r.location_2);else{const c=M[B];if(!c)return;const p=c.name.split(" → ");e=p[0].trim(),o=p[1].trim()}const t=document.getElementById("pickup-location-hint"),i=document.getElementById("dropoff-location-hint");if(t&&(t.textContent=`Please select a location within ${e}`),i&&(i.textContent=`Please select a location within ${o}`),typeof google>"u"||!google.maps){setTimeout(Te,100);return}const a=document.querySelector(".location-selection-section");a&&(a.style.display="block");const s=document.getElementById("location-selection-map");if(!s){console.warn("Location selection map container not found");return}s.style.display="block",s.style.visibility="visible",s.style.height="400px",O?n():setTimeout(()=>{const c=s.parentElement;if(c){const p=window.getComputedStyle(c),u=parseFloat(p.paddingLeft)||0,f=parseFloat(p.paddingRight)||0,l=c.offsetWidth-u-f;s.style.width=l+"px",s.style.minWidth=l+"px",s.style.maxWidth=l+"px",s.style.display="block",s.style.boxSizing="border-box"}else s.style.width="100%",s.style.minWidth="100%",s.style.maxWidth="100%",s.style.display="block";if(O=new google.maps.Map(s,{center:{lat:-24.791,lng:29.185},zoom:8,mapTypeControl:!0,streetViewControl:!1,fullscreenControl:!0}),setTimeout(()=>{O&&google.maps.event.trigger(O,"resize")},300),setTimeout(()=>{O&&google.maps.event.trigger(O,"resize")},600),window.addEventListener("load",()=>{O&&google.maps.event.trigger(O,"resize")}),M[B]&&M[B].coordinates){const p=M[B],u=[{lat:p.coordinates.start[1],lng:p.coordinates.start[0]},{lat:p.coordinates.end[1],lng:p.coordinates.end[0]}];Ce=new google.maps.Polyline({path:u,geodesic:!0,strokeColor:"#01386A",strokeOpacity:1,strokeWeight:3}),Ce.setMap(O)}else if(r){const p=G[e]||G.Pretoria,u=G[o]||G.Tzaneen;{const f=new google.maps.LatLngBounds;f.extend(new google.maps.LatLng(p.center.lat,p.center.lng)),f.extend(new google.maps.LatLng(u.center.lat,u.center.lng)),O.fitBounds(f)}}n()},100);function n(){const c=G[e]||G.Pretoria,p=G[o]||G.Tzaneen,u=document.getElementById("pickup-geocoder-container"),f=document.getElementById("dropoff-geocoder-container");if(u){let y=function(S,x,N){x.innerHTML="",S.forEach(T=>{const P=document.createElement("div");P.style.padding="0.75rem",P.style.cursor="pointer",P.style.borderBottom="1px solid #f0f0f0",P.textContent=T.description,P.addEventListener("mouseenter",()=>{P.style.backgroundColor="#f5f5f5"}),P.addEventListener("mouseleave",()=>{P.style.backgroundColor="white"}),P.addEventListener("click",()=>{N.value=T.description,x.style.display="none",new google.maps.places.PlacesService(O).getDetails({placeId:T.place_id,fields:["geometry","formatted_address","name"]},(b,C)=>{if(C===google.maps.places.PlacesServiceStatus.OK&&b.geometry){const k=b.geometry.location;oe&&oe.setMap(null),oe=new google.maps.Marker({map:O,position:k,icon:{path:google.maps.SymbolPath.CIRCLE,scale:8,fillColor:"#28a745",fillOpacity:1,strokeColor:"#ffffff",strokeWeight:2},title:b.formatted_address||b.name}),F=[{address:b.formatted_address||b.name,lat:k.lat(),lng:k.lng(),index:1}];const A=document.getElementById("pickup-location-input");A&&(A.style.borderColor="#e0e0e0");const q=document.getElementById("location-validation-message");q&&F.length>0&&z.length>0&&(q.style.display="none"),Le(),W()}})}),x.appendChild(P)}),x.style.display="block"};u.innerHTML="";const m=document.createElement("div");m.style.position="relative",m.style.width="100%";const l=document.createElement("input");l.type="text",l.id="pickup-location-input",l.placeholder=`Search for pickup location in ${e}...`,l.style.width="100%",l.style.padding="0.75rem",l.style.border="2px solid #e0e0e0",l.style.borderRadius="8px",l.style.fontSize="1rem",m.appendChild(l);const d=document.createElement("div");d.id="pickup-suggestions",d.style.display="none",d.style.position="absolute",d.style.top="100%",d.style.left="0",d.style.right="0",d.style.backgroundColor="white",d.style.border="1px solid #e0e0e0",d.style.borderRadius="8px",d.style.maxHeight="300px",d.style.overflowY="auto",d.style.zIndex="1000",d.style.boxShadow="0 4px 6px rgba(0,0,0,0.1)",m.appendChild(d),u.appendChild(m);let h=new google.maps.places.AutocompleteService,w;l.addEventListener("input",()=>{clearTimeout(w);const S=l.value.trim();if(S.length<2){d.style.display="none";return}w=setTimeout(()=>{h.getPlacePredictions({input:S,bounds:new google.maps.LatLngBounds(new google.maps.LatLng(c.bounds.south,c.bounds.west),new google.maps.LatLng(c.bounds.north,c.bounds.east)),componentRestrictions:{country:"za"}},(x,N)=>{if(N===google.maps.places.PlacesServiceStatus.OK&&x){const T=x.filter(P=>{const g=P.description.toLowerCase(),b=e.toLowerCase();return g.includes(b)});T.length>0?y(T,d,l):d.style.display="none"}else d.style.display="none"})},300)}),document.addEventListener("click",S=>{m.contains(S.target)||(d.style.display="none")})}if(f){let y=function(S,x,N){x.innerHTML="",S.forEach(T=>{const P=document.createElement("div");P.style.padding="0.75rem",P.style.cursor="pointer",P.style.borderBottom="1px solid #f0f0f0",P.textContent=T.description,P.addEventListener("mouseenter",()=>{P.style.backgroundColor="#f5f5f5"}),P.addEventListener("mouseleave",()=>{P.style.backgroundColor="white"}),P.addEventListener("click",()=>{N.value=T.description,x.style.display="none",new google.maps.places.PlacesService(O).getDetails({placeId:T.place_id,fields:["geometry","formatted_address","name"]},(b,C)=>{if(C===google.maps.places.PlacesServiceStatus.OK&&b.geometry){const k=b.geometry.location;ne&&ne.setMap(null),ne=new google.maps.Marker({map:O,position:k,icon:{path:google.maps.SymbolPath.CIRCLE,scale:8,fillColor:"#dc3545",fillOpacity:1,strokeColor:"#ffffff",strokeWeight:2},title:b.formatted_address||b.name}),z=[{address:b.formatted_address||b.name,lat:k.lat(),lng:k.lng(),index:1}];const A=document.getElementById("dropoff-location-input");A&&(A.style.borderColor="#e0e0e0");const q=document.getElementById("location-validation-message");q&&F.length>0&&z.length>0&&(q.style.display="none"),Le(),W()}})}),x.appendChild(P)}),x.style.display="block"};f.innerHTML="";const m=document.createElement("div");m.style.position="relative",m.style.width="100%";const l=document.createElement("input");l.type="text",l.id="dropoff-location-input",l.placeholder=`Search for dropoff location in ${o}...`,l.style.width="100%",l.style.padding="0.75rem",l.style.border="2px solid #e0e0e0",l.style.borderRadius="8px",l.style.fontSize="1rem",m.appendChild(l);const d=document.createElement("div");d.id="dropoff-suggestions",d.style.display="none",d.style.position="absolute",d.style.top="100%",d.style.left="0",d.style.right="0",d.style.backgroundColor="white",d.style.border="1px solid #e0e0e0",d.style.borderRadius="8px",d.style.maxHeight="300px",d.style.overflowY="auto",d.style.zIndex="1000",d.style.boxShadow="0 4px 6px rgba(0,0,0,0.1)",m.appendChild(d),f.appendChild(m);let h=new google.maps.places.AutocompleteService,w;l.addEventListener("input",()=>{clearTimeout(w);const S=l.value.trim();if(S.length<2){d.style.display="none";return}w=setTimeout(()=>{h.getPlacePredictions({input:S,bounds:new google.maps.LatLngBounds(new google.maps.LatLng(p.bounds.south,p.bounds.west),new google.maps.LatLng(p.bounds.north,p.bounds.east)),componentRestrictions:{country:"za"}},(x,N)=>{if(N===google.maps.places.PlacesServiceStatus.OK&&x){const T=x.filter(P=>{const g=P.description.toLowerCase(),b=o.toLowerCase();return g.includes(b)});T.length>0?y(T,d,l):d.style.display="none"}else d.style.display="none"})},300)}),document.addEventListener("click",S=>{m.contains(S.target)||(d.style.display="none")})}}}function Le(){if(!O)return;const e=new google.maps.LatLngBounds;if(oe&&e.extend(oe.getPosition()),ne&&e.extend(ne.getPosition()),oe&&ne)O.fitBounds(e);else if(B&&M[B]){const o=M[B];o.coordinates&&(e.extend(new google.maps.LatLng(o.coordinates.start[1],o.coordinates.start[0])),e.extend(new google.maps.LatLng(o.coordinates.end[1],o.coordinates.end[0])),O.fitBounds(e))}}function De(){if(Q&&(de&&(de.setMap(null),de=null),pe&&(pe.setMap(null),pe=null),re&&(re.setMap(null),re=null),B&&M[B])){const e=M[B];de=new google.maps.Marker({map:Q,position:{lat:e.coordinates.start[1],lng:e.coordinates.start[0]},icon:{path:google.maps.SymbolPath.CIRCLE,scale:10,fillColor:"#FFD52F",fillOpacity:1,strokeColor:"#ffffff",strokeWeight:2},title:"Start: "+e.name.split(" → ")[0]}),pe=new google.maps.Marker({map:Q,position:{lat:e.coordinates.end[1],lng:e.coordinates.end[0]},icon:{path:google.maps.SymbolPath.CIRCLE,scale:10,fillColor:"#01386A",fillOpacity:1,strokeColor:"#ffffff",strokeWeight:2},title:"End: "+e.name.split(" → ")[1]}),re=new google.maps.Polyline({path:[{lat:e.coordinates.start[1],lng:e.coordinates.start[0]},{lat:e.coordinates.end[1],lng:e.coordinates.end[0]}],geodesic:!0,strokeColor:"#01386A",strokeOpacity:1,strokeWeight:3}),re.setMap(Q);const o=new google.maps.LatLngBounds;o.extend(new google.maps.LatLng(e.coordinates.start[1],e.coordinates.start[0])),o.extend(new google.maps.LatLng(e.coordinates.end[1],e.coordinates.end[0])),Q.fitBounds(o)}}function tt(e){document.querySelectorAll(".route-card").forEach(t=>{t.classList.remove("selected")});const o=document.querySelector(`[data-route="${e}"]`);if(o){o.classList.add("selected"),B=e;const t=o.getAttribute("data-booking-id");t&&window.pendingBookings&&(r=window.pendingBookings.find(i=>i.ID==t),r&&console.log("Selected booking with prices:",{bookingId:r.ID,base_fare:r.base_fare,small_parcel_price:r.small_parcel_price,medium_parcel_price:r.medium_parcel_price,large_parcel_price:r.large_parcel_price}),Ae())}De(),setTimeout(()=>{ge()},500)}function Ae(){if(!r){const n=document.getElementById("booking-type-passengers"),c=document.getElementById("booking-type-parcels"),p=n?n.closest("label"):null,u=c?c.closest("label"):null;p&&(p.style.display="block"),u&&(u.style.display="block"),n&&(n.disabled=!1),c&&(c.disabled=!1);return}const e=r.total_seats_available||0,o=r.extraspace_parcel_count_sp||0,t=document.getElementById("booking-type-passengers"),i=document.getElementById("booking-type-parcels"),a=t?t.closest("label"):null,s=i?i.closest("label"):null;e<=0?(a&&(a.style.display="none"),t&&(t.disabled=!0),L==="passengers"&&o>0?(L="parcels",i&&(i.checked=!0,i.disabled=!1),X("parcels")):L==="passengers"&&o<=0&&console.warn("No seats or parcel space available for this route")):(a&&(a.style.display="block"),t&&(t.disabled=!1)),o<=0&&e<=0?(s&&(s.style.display="none"),i&&(i.disabled=!0),console.warn("No seats or parcel space available for this route")):(s&&(s.style.display="block"),i&&(i.disabled=!1))}function ge(){if(console.log("nextStep() CALLED - currentStep before increment:",_),_<6){let e=_;_===4?e=3:_===5&&(e=4);const o=document.querySelector(`#step${e}`);o&&(o.classList.remove("active"),o.classList.add("completed"));const t=document.querySelector(".booking-content.active");t&&t.classList.remove("active"),_++;let i=_;_===4?i=3:_===5&&(i=4);const a=document.querySelector(`#step${i}`);if(a&&a.classList.add("active"),_===2){const s=document.getElementById("passenger-selection");if(s){s.classList.add("active"),Ae();const c=s.querySelector(".location-selection-section");c&&(c.style.display="block")}Se(),setTimeout(()=>{Te(),W()},300),setTimeout(()=>{O&&google.maps.event.trigger(O,"resize")},800);const n=document.getElementById("desired-trip-date");n&&!n.dataset.bound&&(n.addEventListener("change",()=>{L==="passengers"&&(j=n.value)}),n.dataset.bound="true"),L||(L="passengers")}else if(_===3){console.log("=== ENTERING STEP 3: PASSENGER/PARCEL INFORMATION ==="),console.log("currentStep value:",_),console.log("You are now on step 3. Fill in passenger/parcel info and click Continue again to go to step 4 (Booking Summary)");const s=document.getElementById("passenger-selection");s?(s.classList.add("active"),s.style.display="block",console.log("Passenger selection content is visible"),L==="passengers"?(Se(),console.log("Passenger forms generated")):L==="parcels"&&(te(),console.log("Parcel forms generated"))):console.error("CRITICAL: passenger-selection container not found!")}else if(_===4){console.log("=== ENTERING STEP 4: BOOKING SUMMARY ==="),console.log("currentStep value:",_),console.log("Step 4 handler executing..."),document.querySelectorAll(".booking-content").forEach(n=>{n.classList.remove("active"),n.style.display="none"});const s=document.getElementById("booking-confirmation");if(console.log("Confirmation content found:",!!s),!s){console.error("CRITICAL ERROR: booking-confirmation element does not exist in DOM!"),console.log("Available booking-content elements:",document.querySelectorAll(".booking-content").length);return}if(s){s.classList.add("active"),s.style.display="block",s.style.visibility="visible",s.style.opacity="1",s.style.position="relative",s.style.zIndex="1";const n=document.getElementById("booking-summary");if(console.log("Summary container found:",!!n),n){n.style.display="block",n.style.visibility="visible",n.style.opacity="1",n.style.minHeight="200px",n.style.width="100%";const u=`
                        <div class="summary-row" style="padding: 2rem; text-align: center; background: #d4edda; border: 2px solid #28a745; border-radius: 10px; margin-bottom: 1rem;">
                            <span style="font-size: 1.2rem; color: #155724; font-weight: 700;">TEST: Booking Summary Container is Visible!</span>
                        </div>
                        <div class="summary-row" style="padding: 1.5rem; background: white; border-radius: 10px;">
                            <span>Route:</span>
                            <span>Loading booking information...</span>
                        </div>
                    `;n.innerHTML=u,console.log("Test HTML set in summary container"),n.setAttribute("style","display: block !important; visibility: visible !important; opacity: 1 !important; min-height: 200px !important; width: 100% !important;")}else console.error("CRITICAL: Summary container not found!"),console.log("Parent element:",s),console.log("All children:",Array.from(s.children).map(u=>u.id||u.className));const c=s.querySelector(".booking-actions");console.log("Booking actions found:",!!c),c?(c.style.display="flex",c.style.visibility="visible",c.style.gap="1rem",c.style.marginTop="2rem"):console.error("CRITICAL: Booking actions not found!");const p=s.querySelector("h2");p&&(p.style.display="block",p.style.visibility="visible")}else console.error("CRITICAL: booking-confirmation container not found in DOM!");console.log("Calling updateBookingSummary from step 4"),Z(),setTimeout(()=>{console.log("Calling updateBookingSummary retry 1 (100ms)"),Z()},100),setTimeout(()=>{console.log("Calling updateBookingSummary retry 2 (500ms)"),Z()},500),setTimeout(()=>{console.log("Calling updateBookingSummary retry 3 (1000ms)"),Z()},1e3),setTimeout(()=>{console.log("Final check - calling updateBookingSummary retry 4 (2000ms)"),Z();const n=document.getElementById("booking-summary");n&&console.log("Final check - summary container styles:",{display:window.getComputedStyle(n).display,visibility:window.getComputedStyle(n).visibility,opacity:window.getComputedStyle(n).opacity,innerHTML:n.innerHTML.substring(0,100)})},2e3)}else if(_===5){console.log("=== ENTERING STEP 5: PAYMENT ==="),document.querySelectorAll(".booking-content").forEach(n=>{n.classList.remove("active"),n.style.display="none",n.style.visibility="hidden"});const s=document.getElementById("booking-confirmation");s&&(s.classList.remove("active"),s.style.display="none",s.style.visibility="hidden",s.style.opacity="0",console.log("Booking summary hidden in nextStep() handler")),_e()}}}function ot(){if(_>1){let e=_;_===4?e=3:_===5&&(e=4);const o=document.querySelector(`#step${e}`),t=document.querySelector(".booking-content.active");o&&o.classList.remove("active"),t&&t.classList.remove("active"),_--;let i=_;_===4?i=3:_===5&&(i=4);const a=document.querySelector(`#step${i}`);if(a&&(a.classList.remove("completed"),a.classList.add("active")),_===1){const s=document.getElementById("route-selection");s&&s.classList.add("active")}else if(_===2){const s=document.getElementById("passenger-selection");s&&s.classList.add("active")}else if(_!==3){if(_===4){const s=document.getElementById("booking-confirmation");s&&(s.classList.add("active"),s.style.display="block"),Z()}else if(_===5){const s=document.getElementById("payment-step");s&&s.classList.add("active")}}}}function nt(){const e=document.getElementById("pickup-points-list"),o=Qe++,t=`
        <div class="location-input-item" data-index="${o}">
            <div class="location-input-container">
                <div class="location-input-wrapper">
                    <i class="ri-map-pin-fill location-input-icon"></i>
                    <input type="text" class="location-input pickup-input" placeholder="Enter pickup address in origin city..." data-index="${o}" autocomplete="off">
                    <button class="remove-location-btn" onclick="removeLocation('pickup', ${o})">
                        <i class="ri-close-circle-line"></i>
                    </button>
                </div>
                <div class="suggestions-list" id="suggestions-pickup-${o}"></div>
            </div>
        </div>
    `;e.insertAdjacentHTML("beforeend",t),Ie();const a=M[B].name.split(" → "),s=e.querySelector(`input[data-index="${o}"]`);a[0]}function st(){const e=document.getElementById("dropoff-points-list"),o=Ze++,t=`
        <div class="location-input-item" data-index="${o}">
            <div class="location-input-container">
                <div class="location-input-wrapper">
                    <i class="ri-map-pin-fill location-input-icon"></i>
                    <input type="text" class="location-input dropoff-input" placeholder="Enter drop-off address in destination city..." data-index="${o}" autocomplete="off">
                    <button class="remove-location-btn" onclick="removeLocation('dropoff', ${o})">
                        <i class="ri-close-circle-line"></i>
                    </button>
                </div>
                <div class="suggestions-list" id="suggestions-dropoff-${o}"></div>
            </div>
        </div>
    `;e.insertAdjacentHTML("beforeend",t),Ie();const a=M[B].name.split(" → "),s=e.querySelector(`input[data-index="${o}"]`);a[1]}function at(e,o){const t=e==="pickup"?"pickup-points-list":"dropoff-points-list",i=document.querySelector(`#${t} .location-input-item[data-index="${o}"]`);if(i){if(e==="pickup"){const a=F.findIndex(s=>s.index==o);a!==-1&&(F[a].marker.remove(),F.splice(a,1))}else{const a=z.findIndex(s=>s.index==o);a!==-1&&(z[a].marker.remove(),z.splice(a,1))}i.remove(),Ie()}}function Ie(){const e=document.querySelectorAll("#pickup-points-list .location-input-item");e.forEach((t,i)=>{const a=t.querySelector(".remove-location-btn");e.length>1?a.style.display="flex":a.style.display="none"});const o=document.querySelectorAll("#dropoff-points-list .location-input-item");o.forEach((t,i)=>{const a=t.querySelector(".remove-location-btn");o.length>1?a.style.display="flex":a.style.display="none"})}function it(){if(F.length===0){alert("Please add at least one pickup point for your trip.");return}if(z.length===0){alert("Please add at least one drop-off point for your trip.");return}if(E>0){const e=Pe();if(!e.valid){alert(e.message);return}}ge()}function be(e){const o=e.replace(/[\s\-()]/g,"");return[/^0[1-8]\d{8}$/,/^\+27[1-8]\d{8}$/,/^27[1-8]\d{8}$/,/^0[6-8]\d{8}$/].some(i=>i.test(o))}function rt(e){const o=e.value;if(o.trim()===""){e.style.borderColor="#e0e0e0";return}be(o)?(e.style.borderColor="#28a745",e.style.boxShadow="0 0 0 3px rgba(40, 167, 69, 0.1)"):(e.style.borderColor="#dc3545",e.style.boxShadow="0 0 0 3px rgba(220, 53, 69, 0.1)")}function Pe(){if(!R.senderName||R.senderName.trim()==="")return{valid:!1,message:"Please enter the sender's name."};if(!R.senderPhone||R.senderPhone.trim()==="")return{valid:!1,message:"Please enter the sender's phone number."};if(!be(R.senderPhone))return{valid:!1,message:"Sender's phone number is invalid. Please enter a valid South African phone number (e.g., 071 234 5678 or +27 71 234 5678)."};if(!K.receiverName||K.receiverName.trim()==="")return{valid:!1,message:"Please enter the receiver's name."};if(!K.receiverPhone||K.receiverPhone.trim()==="")return{valid:!1,message:"Please enter the receiver's phone number."};if(!be(K.receiverPhone))return{valid:!1,message:"Receiver's phone number is invalid. Please enter a valid South African phone number (e.g., 082 123 4567 or +27 82 123 4567)."};for(let e=1;e<=E;e++){const o=v[e];if(!o)return{valid:!1,message:`Parcel ${e}: Missing parcel information. Please provide details for all parcels.`};if(!o.size||o.size.trim()==="")return{valid:!1,message:`Parcel ${e}: Please select a parcel size.`};if(!o.images||o.images.length===0)return{valid:!1,message:`Parcel ${e}: Please upload at least one image of the parcel.`}}return{valid:!0}}function lt(){var a,s,n,c,p,u,f,m,l,d,I,h,w,y;const e=localStorage.getItem("userProfile")||sessionStorage.getItem("userProfile");let o=null;if(e)try{o=JSON.parse(e)}catch(S){console.error("Error parsing user profile:",S)}const t=(o==null?void 0:o.email)||"",i=(o==null?void 0:o.phone)||"";for(let S=1;S<=$;S++){const x=((s=(a=document.getElementById(`passenger-firstName-${S}`))==null?void 0:a.value)==null?void 0:s.trim())||"",N=((c=(n=document.getElementById(`passenger-lastName-${S}`))==null?void 0:n.value)==null?void 0:c.trim())||"",T=((u=(p=document.getElementById(`passenger-email-${S}`))==null?void 0:p.value)==null?void 0:u.trim())||"",P=((m=(f=document.getElementById(`passenger-phone-${S}`))==null?void 0:f.value)==null?void 0:m.trim())||"";if(!x||!N)return{valid:!1,message:"Please provide your first name and last name. If they are not showing, please update your profile first."};if(!(t||T)&&!(i||P))return{valid:!1,message:"Please provide either an email address or phone number. At least one contact method is required."};if(T&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(T))return{valid:!1,message:"Please provide a valid email address."};const C=((d=(l=document.getElementById(`passenger-nokFirstName-${S}`))==null?void 0:l.value)==null?void 0:d.trim())||"",k=((h=(I=document.getElementById(`passenger-nokLastName-${S}`))==null?void 0:I.value)==null?void 0:h.trim())||"",A=((y=(w=document.getElementById(`passenger-nokPhone-${S}`))==null?void 0:w.value)==null?void 0:y.trim())||"";if(!C)return{valid:!1,message:"Please provide the next of kin first name."};if(!k)return{valid:!1,message:"Please provide the next of kin last name."};if(!A)return{valid:!1,message:"Please provide the next of kin phone number."};if(A&&A.length<10)return{valid:!1,message:"Please provide a valid next of kin phone number (at least 10 digits)."}}return{valid:!0}}function ct(){var o,t,i,a,s,n,c,p,u,f,m,l,d,I;const e=[];for(let h=1;h<=$;h++){const w=((t=(o=document.getElementById(`passenger-firstName-${h}`))==null?void 0:o.value)==null?void 0:t.trim())||"",y=((a=(i=document.getElementById(`passenger-lastName-${h}`))==null?void 0:i.value)==null?void 0:a.trim())||"",S=((n=(s=document.getElementById(`passenger-email-${h}`))==null?void 0:s.value)==null?void 0:n.trim())||"",x=((p=(c=document.getElementById(`passenger-phone-${h}`))==null?void 0:c.value)==null?void 0:p.trim())||"",N=((f=(u=document.getElementById(`passenger-nokFirstName-${h}`))==null?void 0:u.value)==null?void 0:f.trim())||"",T=((l=(m=document.getElementById(`passenger-nokLastName-${h}`))==null?void 0:m.value)==null?void 0:l.trim())||"",P=((I=(d=document.getElementById(`passenger-nokPhone-${h}`))==null?void 0:d.value)==null?void 0:I.trim())||"";e.push({firstName:w,lastName:y,email:S,phone:x,nextOfKin:{firstName:N,lastName:T,phone:P}})}return e}function ee(){const e=document.getElementById("capacity-info-section"),o=document.getElementById("matching-status"),t=document.getElementById("capacity-fill"),i=document.getElementById("capacity-text"),a=document.getElementById("total-capacity-display");if(L==="passengers"){e&&(e.style.display="none"),o&&(o.style.display="none"),t&&(t.style.width="0%",t.textContent=""),i&&(i.innerHTML='<i class="ri-user-line"></i>Single passenger seat reserved'),a&&(a.textContent=1);return}e&&(e.style.display="block"),o&&(o.style.display="block");const s=se(),n=le(),c=Math.max(s-n.extraSpace,0),p=r?r.total_seats_available||0:15,u=Math.max(p-n.seatParcelCount,0),f=s>0?Math.min(n.extraSpace/s*100,100):0;if(t&&(t.style.width=`${f}%`,t.textContent=`${Math.round(f)}%`),a){let m=`${n.extraSpace} / ${s} extra space used`;n.seatParcelCount>0&&(m+=`, ${n.seatParcelCount} seat parcel${n.seatParcelCount!==1?"s":""}`),a.textContent=m}if(i){let m=0,l=0,d=0,I=0,h=0,w=0;for(let N=1;N<=E;N++)v[N]&&v[N].size&&(v[N].isSeatParcel?v[N].size==="large"?I++:v[N].size==="medium"?h++:v[N].size==="small"&&w++:v[N].size==="large"?m++:v[N].size==="medium"?l++:v[N].size==="small"&&d++);const y=[];m>0&&y.push(`${m} large`),l>0&&y.push(`${l} medium`),d>0&&y.push(`${d} small`);const S=[];I>0&&S.push(`${I} large`),h>0&&S.push(`${h} medium`),w>0&&S.push(`${w} small`);let x=`<i class="ri-box-3-line"></i>${E} parcel${E!==1?"s":""} selected`;y.length>0&&(x+=` - Extra Space: ${y.join(", ")}`),S.length>0&&(x+=` - Seat Parcels: ${S.join(", ")} (at seat price)`),i.innerHTML=x}if(o){const m=o.querySelector(".matching-timer");if(m){let l="";c>0?l+=`<i class="ri-information-line"></i> ${c} extra space remaining`:n.extraSpace>0&&(l+='<i class="ri-checkbox-circle-line" style="color: #28a745;"></i> Extra space full'),u>0?(l&&(l+=" | "),l+=`${u} seat${u!==1?"s":""} available for seat parcels`):n.seatParcelCount>0&&(l&&(l+=" | "),l+="All seats used for parcels"),l||(l='<i class="ri-error-warning-line" style="color: #dc3545;"></i> No more space available'),m.innerHTML=l}}}function W(){const e=document.getElementById("continue-passenger-btn"),o=document.getElementById("parcel-validation-message"),t=document.getElementById("validation-message-text");if(!e)return;if(!(F.length>0&&z.length>0)){e.disabled=!0,e.style.opacity="0.5",e.style.cursor="not-allowed";return}if(L==="parcels"){const a=Pe();a.valid?(e.disabled=!1,e.style.opacity="1",e.style.cursor="pointer",o&&(o.style.display="none")):(e.disabled=!0,e.style.opacity="0.5",e.style.cursor="not-allowed",o&&(o.style.display="block"),t&&(t.textContent=a.message))}else e.disabled=!1,e.style.opacity="1",e.style.cursor="pointer",o&&(o.style.display="none")}function dt(){if(console.log("=== validateAndProceed() CALLED ==="),console.log("Current state:",{currentStep:_,pickupPoints:F.length,dropoffPoints:z.length,bookingType:L,passengerCount:$}),F.length===0){console.log("VALIDATION FAILED: No pickup points");const i=document.getElementById("location-validation-message"),a=document.getElementById("location-validation-message-text");i&&(i.style.display="block"),a&&(a.textContent="Please select a pickup location before proceeding.");const s=document.querySelector(".location-selection-section");s&&s.scrollIntoView({behavior:"smooth",block:"center"});const n=document.getElementById("pickup-location-input");n&&(n.style.borderColor="#dc3545",n.style.borderWidth="2px",n.focus());return}if(z.length===0){const i=document.getElementById("location-validation-message"),a=document.getElementById("location-validation-message-text");i&&(i.style.display="block"),a&&(a.textContent="Please select a dropoff location before proceeding.");const s=document.querySelector(".location-selection-section");s&&s.scrollIntoView({behavior:"smooth",block:"center"});const n=document.getElementById("dropoff-location-input");n&&(n.style.borderColor="#dc3545",n.style.borderWidth="2px",n.focus());return}const e=document.getElementById("location-validation-message");e&&(e.style.display="none");const o=document.getElementById("pickup-location-input"),t=document.getElementById("dropoff-location-input");if(o&&(o.style.borderColor="#e0e0e0"),t&&(t.style.borderColor="#e0e0e0"),L==="passengers"&&E>0){alert("Error: Cannot book both passengers and parcels at the same time. Please select only passenger booking."),E=0,v={};return}if(L==="parcels"&&$>0){alert("Error: Cannot book both passengers and parcels at the same time. Please select only parcel booking."),$=0;return}if(L==="parcels"){if($>0){alert("Error: Cannot book passengers when parcel booking is selected. Please select only parcel booking."),$=0;return}const i=Pe();if(!i.valid){const a=document.getElementById("parcel-validation-message"),s=document.getElementById("validation-message-text");a&&(a.style.display="block"),s&&(s.textContent=i.message),a.scrollIntoView({behavior:"smooth",block:"center"});return}}else{if(E>0){alert("Error: Cannot book parcels when passenger booking is selected. Please select only passenger booking."),E=0,v={};return}if($<1){alert("Please select at least 1 passenger.");return}const i=lt();if(i.valid){const a=document.getElementById("passenger-validation-message");a&&(a.style.display="none");const s=ct();if(s.length>0){const n=s[0];try{localStorage.setItem("passengerContactInfo",JSON.stringify({firstName:n.firstName,lastName:n.lastName,email:n.email,phone:n.phone})),n.nextOfKin&&localStorage.setItem("passengerNextOfKin",JSON.stringify(n.nextOfKin))}catch(c){console.warn("Unable to persist passenger contact snapshot locally:",c)}}sessionStorage.setItem("passengerData",JSON.stringify(s)),sessionStorage.setItem("passengerCount",$.toString())}else{const a=document.getElementById("passenger-validation-message"),s=document.getElementById("passenger-validation-message-text");a&&(a.style.display="block"),s&&(s.textContent=i.message);const n=document.getElementById("passenger-details");n&&n.scrollIntoView({behavior:"smooth",block:"center"});return}}if(sessionStorage.setItem("bookingType",L),L==="parcels"&&(sessionStorage.setItem("parcelCount",E),sessionStorage.setItem("parcelData",JSON.stringify(v))),L==="passengers"&&sessionStorage.setItem("desiredTripDate",j),console.log("About to call nextStep() from validateAndProceed, currentStep:",_),_===2){console.log("Skipping step 3, going directly to step 4 (Booking Summary)");const i=document.querySelector("#step2");i&&(i.classList.remove("active"),i.classList.add("completed"));const a=document.getElementById("passenger-selection");a&&(a.classList.remove("active"),a.style.display="none"),_=4;const s=document.querySelector("#step3");s&&s.classList.add("active");const n=document.getElementById("booking-confirmation");n&&(n.classList.add("active"),n.style.display="block",n.style.visibility="visible",n.style.opacity="1"),Z(),console.log("After skipping to step 4, currentStep is now:",_)}else ge(),console.log("After calling nextStep(), currentStep is now:",_)}function X(e){if(L=e,e==="passengers")E=0,v={},$=1,sessionStorage.removeItem("parcelData");else if(e==="parcels"){$=0;const s=[];sessionStorage.setItem("passengerData",JSON.stringify(s)),E=Math.max(1,E),v[1]||(v[1]={secretCode:fe(),images:[],size:"small"});for(let p=1;p<=E;p++)v[p]&&!v[p].size&&(v[p].size="small");const n=sessionStorage.getItem("sharedSenderInfo"),c=sessionStorage.getItem("sharedReceiverInfo");n&&(R=JSON.parse(n)),c&&(K=JSON.parse(c))}const o=document.getElementById("passenger-booking-section"),t=document.getElementById("parcel-booking-section"),i=document.getElementById("capacity-info-section"),a=document.getElementById("matching-status");e==="passengers"?(o&&(o.style.display="block"),t&&(t.style.display="none"),i&&(i.style.display="none"),a&&(a.style.display="none"),ye()):(o&&(o.style.display="none"),t&&(t.style.display="block"),i&&(i.style.display="block"),a&&(a.style.display="block"),te()),ee(),ie(),W()}window.handleBookingTypeChange=X;function pt(){L==="passengers"&&$<1&&($=1,ye(),ee(),ie(),xe())}function mt(){L==="passengers"&&$>1&&($--,ye(),ee(),ie(),xe())}function ut(){if(L!=="parcels")return;const e=r?r.total_seats_available||0:15,o=le(),t=o.seatParcelCount||0,i=se(),a=Math.max(i-o.extraSpace,0);if(a>0||e>0&&t<e){if(E++,!v[E]){const s=se(),c=le().extraSpace>=s&&e>0;v[E]={secretCode:fe(),images:[],size:"small",isSeatParcel:c}}te(),ie(),ee()}else{const s=document.createElement("div");s.style.cssText="position: fixed; top: 20px; right: 20px; background: #dc3545; color: white; padding: 1rem 1.5rem; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; max-width: 300px;";let n="";a<=0&&e<=0?n="No more parcel space or seats available for this route.":a<=0?n="Extra parcel space is full. Seat parcels are not available as all seats are occupied.":n="Cannot add more parcels at this time.",s.innerHTML=`
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="ri-error-warning-line" style="font-size: 1.5rem;"></i>
                <div>
                    <strong>Capacity Full</strong>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">${n}</p>
                </div>
            </div>
        `,document.body.appendChild(s),setTimeout(()=>{s.remove()},3e3)}}function gt(){L==="parcels"&&E>1&&(delete v[E],E--,te(),ie(),ee())}function ie(){const e=document.getElementById("passenger-count-display-public"),o=document.getElementById("parcel-count-display-public");e&&(e.textContent=$),o&&(o.textContent=E),L==="passengers"&&xe()}function xe(){if(L!=="passengers")return;const e=document.getElementById("passenger-booking-section");if(e){const o=e.querySelector(".counter-controls-public");if(o){const t=o.querySelector('button[onclick="incrementPassengersPublic()"]');t&&($>=1?(t.disabled=!0,t.style.opacity="0.5",t.style.cursor="not-allowed",t.title="Only 1 passenger allowed. Others can join through links."):(t.disabled=!1,t.style.opacity="1",t.style.cursor="pointer",t.title=""))}}}function fe(){return Math.floor(1e5+Math.random()*9e5).toString()}function Se(){const e=document.getElementById("booking-type-passengers"),o=document.getElementById("booking-type-parcels");e&&e.addEventListener("change",function(){this.checked&&X("passengers")}),o&&o.addEventListener("change",function(){this.checked&&X("parcels")}),e&&e.checked?(L="passengers",X("passengers")):o&&o.checked?(L="parcels",X("parcels")):(L="passengers",e&&(e.checked=!0),X("passengers"));const t=document.getElementById("passenger-forms"),i=document.getElementById("parcel-forms");t&&L==="passengers"?ye():i&&Ge&&L==="parcels"&&te(),ee(),ie()}function ye(){const e=document.getElementById("passenger-forms");if(!e)return;e.innerHTML="";const o=localStorage.getItem("userProfile")||sessionStorage.getItem("userProfile");let t=null;if(o)try{t=JSON.parse(o)}catch(y){console.error("Error parsing user profile:",y)}const i=H(t==null?void 0:t.firstName),a=H(t==null?void 0:t.lastName),s=H(t==null?void 0:t.email),n=H(t==null?void 0:t.phone),c=(t==null?void 0:t.nextOfKin)||{},p=H(c.firstName??(t==null?void 0:t.nextOfKinFirstName)??(t==null?void 0:t.next_of_kin_first_name)),u=H(c.lastName??(t==null?void 0:t.nextOfKinLastName)??(t==null?void 0:t.next_of_kin_last_name)),f=H(c.phone??(t==null?void 0:t.nextOfKinPhone)??(t==null?void 0:t.next_of_kin_phone));let m=[];const l=sessionStorage.getItem("passengerData");if(l)try{const y=JSON.parse(l);Array.isArray(y)&&(m=y)}catch(y){console.warn("Unable to parse stored passenger data:",y)}let d=null;const I=localStorage.getItem("passengerContactInfo");if(I)try{d=JSON.parse(I)}catch(y){console.warn("Unable to parse stored passenger contact info:",y)}let h=null;const w=localStorage.getItem("passengerNextOfKin");if(w)try{const y=JSON.parse(w);y&&typeof y=="object"&&(h=y)}catch(y){console.warn("Unable to parse stored next of kin info:",y)}$<1&&($=1);for(let y=1;y<=$;y++){const S=m[y-1]||(y===1?d:null)||{},x=S.nextOfKin||h||{},N=H(S.firstName)||i,T=H(S.lastName)||a,P=H(S.email)||s,g=H(S.phone)||n,b=H(x.firstName)||p,C=H(x.lastName)||u,k=H(x.phone)||f,A=Y(N||""),q=Y(T||""),J=Y(P||""),D=Y(g||""),ce=Y(b||""),He=Y(C||""),Ke=Y(k||""),Ye=i?'readonly style="background-color: #f8f9fa; cursor: not-allowed;"':N?"":"required",Je=a?'readonly style="background-color: #f8f9fa; cursor: not-allowed;"':T?"":"required",ve=[];s&&ve.push('readonly style="background-color: #f8f9fa; cursor: not-allowed;"'),P||ve.push("required");const he=[];n&&he.push('readonly style="background-color: #f8f9fa; cursor: not-allowed;"'),g||he.push("required");const Ee=!P||!g,je=`
            <div class="passenger-form-card">
                <h5 class="passenger-form-title">
                        <i class="ri-user-line"></i>
                    Passenger Information
                    </h5>
                <div class="passenger-form-grid">
                    <div class="passenger-form-group">
                        <label>
                            <i class="ri-user-3-line"></i>
                            First Name <span style="color: #dc3545;">*</span>
                        </label>
                        <input type="text" placeholder="First name" id="passenger-firstName-${y}" value="${A}" ${Ye}>
                    </div>
                    <div class="passenger-form-group">
                        <label>
                            <i class="ri-user-3-line"></i>
                            Last Name <span style="color: #dc3545;">*</span>
                        </label>
                        <input type="text" placeholder="Last name" id="passenger-lastName-${y}" value="${q}" ${Je}>
                    </div>
                    <div class="passenger-form-group">
                        <label>
                            <i class="ri-mail-line"></i>
                            Email Address <span style="color: #dc3545;">*</span>
                        </label>
                        <input type="email" placeholder="e.g., john@example.com" id="passenger-email-${y}" value="${J}" ${ve.join(" ")}>
                        ${Ee?'<small style="color: #6c757d; display: block; margin-top: 0.25rem;">Ensure we can reach you via email or phone.</small>':""}
                    </div>
                    <div class="passenger-form-group">
                        <label>
                            <i class="ri-phone-line"></i>
                            Phone Number <span style="color: #dc3545;">*</span>
                        </label>
                        <input type="tel" placeholder="e.g., 0712345678" id="passenger-phone-${y}" value="${D}" ${he.join(" ")}>
                        ${Ee?'<small style="color: #6c757d; display: block; margin-top: 0.25rem;">Ensure we can reach you via phone or email.</small>':""}
                    </div>
                </div>
            </div>
            <div class="passenger-form-card">
                <h5 class="passenger-form-title">
                    <i class="ri-user-heart-line"></i>
                    Next of Kin Information
                    </h5>
                    <div class="passenger-form-grid">
                        <div class="passenger-form-group">
                            <label>
                                <i class="ri-user-3-line"></i>
                                Next of Kin First Name <span style="color: #dc3545;">*</span>
                            </label>
                        <input type="text" placeholder="Enter first name" id="passenger-nokFirstName-${y}" value="${ce}" required>
                        </div>
                        <div class="passenger-form-group">
                            <label>
                                <i class="ri-user-3-line"></i>
                                Next of Kin Last Name <span style="color: #dc3545;">*</span>
                            </label>
                        <input type="text" placeholder="Enter last name" id="passenger-nokLastName-${y}" value="${He}" required>
                        </div>
                        <div class="passenger-form-group">
                            <label>
                                <i class="ri-phone-line"></i>
                                Next of Kin Phone Number <span style="color: #dc3545;">*</span>
                            </label>
                        <input type="tel" placeholder="e.g., 0712345678" id="passenger-nokPhone-${y}" value="${Ke}" required>
                    </div>
                </div>
            </div>
        `;e.innerHTML+=je}}function te(){const e=document.getElementById("parcel-forms");if(!e)return;e.innerHTML="";const o=localStorage.getItem("userProfile")||sessionStorage.getItem("userProfile");let t=null;if(o)try{t=JSON.parse(o)}catch(n){console.error("Error parsing user profile:",n)}if(!R.senderName||R.senderName.trim()===""){let n="";t&&(t.firstName&&t.lastName?n=`${t.firstName} ${t.lastName}`.trim():t.name?n=t.name:t.firstName&&(n=t.firstName)),R.senderName=H(n)}if(!R.senderPhone||R.senderPhone.trim()===""){const n=(t==null?void 0:t.phone)||(t==null?void 0:t.phoneNumber)||"";R.senderPhone=H(n)}const i=`
        <div class="passenger-form-card" style="margin-bottom: 2rem; background: linear-gradient(135deg, #e7f3ff 0%, #d1e7ff 100%); border: 2px solid #01386A;">
            <div class="passenger-form-header">
                <h5 style="color: #01386A;"><i class="ri-information-line"></i> Shared Sender & Receiver Information</h5>
                <p style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">This information will be used for all parcels</p>
            </div>
            
            <h5 style="color: #01386A; margin-bottom: 1rem; font-size: 1.1rem; margin-top: 1.5rem;"><i class="ri-user-fill"></i> Sender Information</h5>
            <div class="passenger-form-grid" style="margin-bottom: 1.5rem;">
                <div class="passenger-form-group">
                    <label><i class="ri-user-3-line"></i> Sender Name <span style="color: #dc3545;">*</span></label>
                    <input type="text" id="sharedSenderNamePublic" 
                        value="${R.senderName||""}" 
                        onchange="updateSharedSenderInfo('senderName', this.value)"
                        placeholder="Enter sender's full name">
                </div>
                <div class="passenger-form-group">
                    <label><i class="ri-phone-line"></i> Sender Phone <span style="color: #dc3545;">*</span></label>
                    <input type="tel" id="sharedSenderPhonePublic" 
                        value="${R.senderPhone||""}" 
                        onchange="updateSharedSenderInfo('senderPhone', this.value)"
                        oninput="validatePhoneInputPublic(this)"
                        placeholder="e.g., 071 234 5678">
                    <small style="color: #6c757d; font-size: 0.85rem; margin-top: 0.25rem; display: block;">Format: 071 234 5678 or +27 71 234 5678</small>
                </div>
            </div>
            
            <h5 style="color: #01386A; margin-bottom: 1rem; font-size: 1.1rem;"><i class="ri-user-received-line"></i> Receiver Information</h5>
            <div class="passenger-form-grid" style="margin-bottom: 1.5rem;">
                <div class="passenger-form-group">
                    <label><i class="ri-user-3-line"></i> Receiver Name <span style="color: #dc3545;">*</span></label>
                    <input type="text" id="sharedReceiverNamePublic" 
                        value="${K.receiverName||""}" 
                        onchange="updateSharedReceiverInfo('receiverName', this.value)"
                        placeholder="Enter receiver's full name">
                </div>
                <div class="passenger-form-group">
                    <label><i class="ri-phone-line"></i> Receiver Phone <span style="color: #dc3545;">*</span></label>
                    <input type="tel" id="sharedReceiverPhonePublic" 
                        value="${K.receiverPhone||""}" 
                        onchange="updateSharedReceiverInfo('receiverPhone', this.value)"
                        oninput="validatePhoneInputPublic(this)"
                        placeholder="e.g., 071 234 5678">
                    <small style="color: #6c757d; font-size: 0.85rem; margin-top: 0.25rem; display: block;">Format: 071 234 5678 or +27 71 234 5678</small>
                </div>
            </div>
        </div>
    `;e.innerHTML=i;const a=le(),s=se();for(let n=1;n<=E;n++){if(v[n]){if(v[n].size&&v[n].isSeatParcel===void 0){const f=a.extraSpace||0,m=r?r.total_seats_available||0:15;v[n].isSeatParcel=f>=s&&m>0}}else{const f=a.extraSpace||0,m=r?r.total_seats_available||0:15,l=f>=s&&m>0;v[n]={secretCode:fe(),images:[],size:"small",isSeatParcel:l}}const c=v[n].isSeatParcel||!1,u=`
            <div class="parcel-card-public" ${c?'style="border: 2px solid #FFD52F; background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%);"':""}>
                <div class="passenger-form-header">
                    <h5><i class="ri-box-3-line"></i> Parcel ${n}</h5>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="background: #01386A; color: white; padding: 0.3rem 0.8rem; border-radius: 15px; font-size: 0.9rem; font-weight: 600;">#${n}</div>
                        ${c?'<div style="background: #FFD52F; color: #01386A; padding: 0.3rem 0.8rem; border-radius: 15px; font-size: 0.85rem; font-weight: 700; margin-left: 0.5rem;"><i class="ri-seat-line"></i> Seat Parcel (Seat Price)</div>':""}
                    </div>
                </div>
                
                <div class="passenger-form-grid" style="margin-bottom: 1.5rem;">
                    <div class="passenger-form-group" style="grid-column: 1 / -1;">
                        <label><i class="ri-camera-line"></i> Parcel Image(s) <span style="color: #dc3545;">*</span></label>
                        <div class="parcel-image-upload-public" onclick="document.getElementById('parcelImage${n}Public').click()">
                            <i class="ri-upload-cloud-line" style="font-size: 2.5rem; color: #01386A;"></i>
                            <p style="margin-top: 0.5rem; color: #6c757d; font-size: 0.95rem;">Click to upload parcel image(s)</p>
                            <input type="file" id="parcelImage${n}Public" accept="image/*" multiple style="display: none;" 
                                onchange="handleParcelImageUploadPublic(${n}, this)">
                        </div>
                        <div id="parcelImagePreview${n}Public" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem;">
                        </div>
                    </div>
                </div>
                
                <h5 style="color: #01386A; margin-bottom: 1rem; font-size: 1.1rem;"><i class="ri-scales-3-line"></i> Parcel Size</h5>
                <div class="passenger-form-grid" style="margin-bottom: 1.5rem;">
                    <div class="passenger-form-group">
                        <label><i class="ri-ruler-2-line"></i> Select Parcel Size <span style="color: #dc3545;">*</span></label>
                        <select id="parcelSize${n}Public" onchange="updateParcelFieldPublic(${n}, 'size', this.value)">
                            <option value="small" ${v[n].size==="small"?"selected":""}>Small (&lt; 5kg)</option>
                            <option value="medium" ${v[n].size==="medium"?"selected":""}>Medium (&lt; 15kg)</option>
                            <option value="large" ${v[n].size==="large"?"selected":""}>Large (&lt; 30kg)</option>
                        </select>
                    </div>
                </div>
            </div>
        `;e.innerHTML+=u}}function ft(e,o){e==="senderName"?R.senderName=o:e==="senderPhone"&&(R.senderPhone=o),W()}function yt(e,o){e==="receiverName"?K.receiverName=o:e==="receiverPhone"&&(K.receiverPhone=o),W()}window.updateSharedSenderInfo=ft;window.updateSharedReceiverInfo=yt;function Re(e){switch(e){case"large":return 4;case"medium":return 2;case"small":return 1;default:return 1}}function le(){const e=se(),o=r?r.total_seats_available||0:15;let t=0,i=0,a=0;for(let s=1;s<=E;s++)if(v[s]&&v[s].size){const n=Re(v[s].size);v[s].isSeatParcel?i>=o&&t+n<=e?(v[s].isSeatParcel=!1,t+=n):(i++,a+=n):t+n<=e?(v[s].isSeatParcel=!1,t+=n):i<o?(v[s].isSeatParcel=!0,i++,a+=n):v[s].isSeatParcel=!1}return{total:t+a,extraSpace:t,seatParcels:a,seatParcelCount:i}}function se(){return r?r.extraspace_parcel_count_sp||0:12}function vt(e,o,t){if(v[e]){const i=v[e][o];if(v[e][o]=t,o==="size"&&i!==t){const a=se();if(le().extraSpace>a){let n=0;for(let p=1;p<=E;p++)if(v[p]&&v[p].size){const u=Re(v[p].size);n+u<=a?(v[p].isSeatParcel=!1,n+=u):v[p].isSeatParcel=!0}const c=document.createElement("div");c.style.cssText="position: fixed; top: 20px; right: 20px; background: #ffc107; color: #000; padding: 1rem 1.5rem; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; max-width: 300px;",c.innerHTML=`
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="ri-information-line" style="font-size: 1.5rem;"></i>
                        <div>
                            <strong>Extra Space Full</strong>
                            <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">Some parcels will use seat space at seat price.</p>
                        </div>
                    </div>
                `,document.body.appendChild(c),setTimeout(()=>{c.remove()},5e3)}te(),ee()}W()}}function ht(e,o){if(o.files&&o.files.length>0){const t=document.getElementById(`parcelImagePreview${e}Public`);t.innerHTML="",v[e].images=Array.from(o.files),Array.from(o.files).forEach((i,a)=>{const s=new FileReader;s.onload=function(n){const c=document.createElement("div");c.style.position="relative",c.innerHTML=`
                    <img src="${n.target.result}" class="parcel-image-preview-public" alt="Parcel ${e} Image ${a+1}">
                    <button type="button" onclick="removeParcelImagePublic(${e}, ${a})" 
                        style="position: absolute; top: 5px; right: 5px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        <i class="ri-close-line"></i>
                    </button>
                `,t.appendChild(c)},s.readAsDataURL(i)}),W()}}function bt(e,o){v[e]&&v[e].images&&(v[e].images.splice(o,1),te(),W())}function Z(){console.log("=== updateBookingSummary FUNCTION CALLED ==="),console.log("State:",{selectedRoute:B,selectedBooking:r?"exists":"null",pickupPoints:F.length,dropoffPoints:z.length,passengerCount:$,bookingType:L,currentStep:_});const e=document.getElementById("booking-summary");if(!e){console.error("CRITICAL ERROR: booking-summary container does not exist in DOM!");const f=document.getElementById("booking-confirmation");if(f){const m=document.createElement("div");m.id="booking-summary",m.className="booking-summary",m.style.display="block",m.style.visibility="visible",m.style.minHeight="200px";const l=f.querySelector("h2");return l&&l.nextSibling?f.insertBefore(m,l.nextSibling):f.appendChild(m),console.log("Created booking-summary container as fallback"),Z()}return}e.style.display="block",e.style.visibility="visible",e.style.opacity="1",e.style.minHeight="200px",e.style.width="100%";let o="Route not selected",t=0,i=0,a=0;if(r)r.direction_type==="from_loc1"?o=`${r.location_1||"Location 1"} → ${r.location_2||"Location 2"}`:r.direction_type==="from_loc2"?o=`${r.location_2||"Location 2"} → ${r.location_1||"Location 1"}`:o=`${r.location_1||"Location 1"} → ${r.location_2||"Location 2"}`,t=parseFloat(r.base_fare)||0,i=parseFloat(r.typical_duration_hours)||0,a=0;else if(B&&M&&M[B]){const f=M[B];o=f.name||"Route not selected",t=f.price||0,i=f.duration||0,a=f.distance||0}else console.warn("No route data available for summary. Using defaults."),o="Route information unavailable";const s=sessionStorage.getItem("bookingType")||L,n=parseInt(sessionStorage.getItem("passengerCount")||$)||$;if(s==="parcels"){const f=sessionStorage.getItem("sharedSenderInfo"),m=sessionStorage.getItem("sharedReceiverInfo");if(f)try{R=JSON.parse(f)}catch(l){console.warn("Error parsing shared sender info:",l)}if(m)try{K=JSON.parse(m)}catch(l){console.warn("Error parsing shared receiver info:",l)}}let c="";if(s==="parcels"){const f=parseInt(sessionStorage.getItem("parcelCount")||E)||E,m=JSON.parse(sessionStorage.getItem("parcelData")||JSON.stringify(v))||v,l=(r==null?void 0:r.small_parcel_price)!=null?parseFloat(r.small_parcel_price):U.small,d=(r==null?void 0:r.medium_parcel_price)!=null?parseFloat(r.medium_parcel_price):U.medium,I=(r==null?void 0:r.large_parcel_price)!=null?parseFloat(r.large_parcel_price):U.large,h=parseFloat(t)||0;let w=0,y=0,S=0,x=0;for(let k=1;k<=f;k++)m[k]&&m[k].size&&(m[k].isSeatParcel?(y+=h,x++):(m[k].size==="large"?w+=I:m[k].size==="medium"?w+=d:m[k].size==="small"&&(w+=l),S++));w=parseFloat(w)||0,y=parseFloat(y)||0;const N=w+y;c=`
            <div class="summary-row">
                <span>Booking Type:</span>
                <span><strong>Parcel Delivery</strong></span>
            </div>
            <div class="summary-row">
                <span>Route:</span>
                <span>${o}</span>
            </div>
            <div class="summary-row">
                <span>Number of Parcels:</span>
                <span>${f} parcel(s)${x>0?` (${S} extra space, ${x} seat parcel${x!==1?"s":""})`:""}</span>
            </div>
            ${x>0?`<div class="summary-row" style="color: #FFD52F; font-weight: 600;">
                <span><i class="ri-seat-line"></i> Seat Parcels:</span>
                <span>${x} × R${h.toFixed(2)} = R${y.toFixed(2)}</span>
            </div>`:""}
            ${S>0?`<div class="summary-row">
                <span>Extra Space Parcels:</span>
                <span>R${w.toFixed(2)}</span>
            </div>`:""}
            ${a>0?`<div class="summary-row">
                <span>Distance:</span>
                <span>${a} km</span>
            </div>`:""}
            <div class="summary-row">
                <span>Duration:</span>
                <span>~${i} hours</span>
            </div>
        `,c+=`<div class="summary-row" style="grid-column: 1 / -1; margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #e0e0e0;">
            <span><strong>Sender & Receiver Information:</strong></span>
        </div>`,c+=`
            <div class="summary-row" style="grid-column: 1 / -1; padding-left: 2rem;">
                <span>Sender:</span>
                <span>${R.senderName||"Not specified"} - ${R.senderPhone||"Not specified"}</span>
            </div>
            <div class="summary-row" style="grid-column: 1 / -1; padding-left: 2rem;">
                <span>Receiver:</span>
                <span>${K.receiverName||"Not specified"} - ${K.receiverPhone||"Not specified"}</span>
            </div>
        `,m&&Object.keys(m).length>0&&(c+=`<div class="summary-row" style="grid-column: 1 / -1; margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #e0e0e0;">
                <span><strong>Parcel Details:</strong></span>
            </div>`,Object.keys(m).forEach(k=>{const A=m[k];A&&(c+=`
                        <div class="summary-row" style="grid-column: 1 / -1; padding-left: 2rem;">
                            <span><strong>Parcel ${k}:</strong></span>
                        </div>
                        <div class="summary-row" style="grid-column: 1 / -1; padding-left: 4rem;">
                            <span>Size:</span>
                            <span>${A.size||"Not specified"}</span>
                        </div>
                    `)}));const T=JSON.parse(sessionStorage.getItem("parcelCodes")||"{}"),P=T.sender_code||null,g=T.receiver_code||null;(P||g)&&(c+=`<div class="summary-row" style="grid-column: 1 / -1; margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #e0e0e0;">
                <span><strong>Verification Codes:</strong></span>
            </div>`,P&&(c+=`
                    <div class="summary-row" style="grid-column: 1 / -1; padding-left: 2rem;">
                        <span>Sender Code (for pickup verification):</span>
                        <span><strong style="color: #01386A; font-size: 1.1rem;">${P}</strong></span>
                    </div>
                `),g&&(c+=`
                    <div class="summary-row" style="grid-column: 1 / -1; padding-left: 2rem;">
                        <span>Receiver Code (for delivery verification):</span>
                        <span><strong style="color: #01386A; font-size: 1.1rem;">${g}</strong></span>
                    </div>
                `));let b=0;S>0&&w>0&&(b=parseFloat(w)/parseFloat(S),b=isNaN(b)?0:b);const C=parseFloat(N)||0;c+=`
            ${S>0?`<div class="summary-row" style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #e0e0e0;">
                <span>Average Price per Extra Space Parcel:</span>
                <span>R${b.toFixed(2)}</span>
            </div>`:""}
            <div class="summary-row" style="margin-top: ${S>0?"0.5rem":"1rem"}; padding-top: ${S>0?"0.5rem":"1rem"}; border-top: ${S>0?"none":"2px solid #e0e0e0"};">
                <span><strong>Total Amount:</strong></span>
                <span><strong>R${C.toFixed(2)}</strong></span>
            </div>
        `}else{const f=t*n;let m="Not specified";F.length>0&&(m=F.map(h=>h.address).join("<br>"));let l="Not specified";z.length>0&&(l=z.map(h=>h.address).join("<br>"));let d="-",I="To be confirmed";if(r&&r.scheduled_pickup)d=me(r.scheduled_pickup),I=ue(r.scheduled_pickup);else if(j)d=me(j),I=ue(j);else{const h=sessionStorage.getItem("desiredTripDate");h&&(d=me(h),I=ue(h))}c=`
            <div class="summary-row">
                <span>Route:</span>
                <span>${o}</span>
            </div>
            <div class="summary-row">
                <span>Trip Date:</span>
                <span>${d}</span>
            </div>
            <div class="summary-row">
                <span>Trip Time:</span>
                <span>${I}</span>
            </div>
            <div class="summary-row">
                <span>Passengers:</span>
                <span>${n} person(s)</span>
            </div>
            ${a>0?`<div class="summary-row">
                <span>Distance:</span>
                <span>${a} km</span>
            </div>`:""}
            <div class="summary-row">
                <span>Duration:</span>
                <span>~${i} hours</span>
            </div>
            <div class="summary-row">
                <span>Pickup Points:</span>
                <span>${m}</span>
            </div>
            <div class="summary-row">
                <span>Drop-off Points:</span>
                <span>${l}</span>
            </div>
        `,c+=`
            <div class="summary-row">
                <span><strong>Total Amount:</strong></span>
                <span><strong>R${f.toFixed(2)}</strong></span>
            </div>
        `}(!c||c.trim().length===0)&&(c=`
            <div class="summary-row" style="padding: 2rem; background: #fff3cd; border-radius: 10px; margin-bottom: 1rem;">
                <span style="font-weight: 700; color: #856404;">Route:</span>
                <span style="color: #856404;">Loading booking information...</span>
            </div>
            <div class="summary-row" style="padding: 2rem; background: #d1ecf1; border-radius: 10px;">
                <span style="font-weight: 700; color: #0c5460;">Status:</span>
                <span style="color: #0c5460;">Please wait while we load your booking details</span>
            </div>
        `,console.warn("Summary HTML was empty, using fallback")),e.innerHTML=c,e.style.display="block",e.style.visibility="visible",e.style.opacity="1",e.style.minHeight="200px",e.style.width="100%";const p=window.getComputedStyle(e);console.log("Booking summary updated successfully",{htmlLength:c.length,containerExists:!!e,containerDisplay:p.display,containerVisibility:p.visibility,containerOpacity:p.opacity,containerHeight:p.height,parentDisplay:e.parentElement?window.getComputedStyle(e.parentElement).display:"no parent",preview:c.substring(0,150)+"..."}),(p.display==="none"||p.visibility==="hidden")&&(console.warn("Container is still hidden, forcing with !important"),e.setAttribute("style","display: block !important; visibility: visible !important; opacity: 1 !important; min-height: 200px !important; width: 100% !important;"));const u=document.getElementById("booking-confirmation");if(u){u.style.display="block",u.style.visibility="visible",u.classList.add("active");const f=u.querySelector(".booking-actions");f?(f.style.display="flex",f.style.gap="1rem",f.style.visibility="visible"):console.warn("Booking actions container not found");const m=u.querySelector("h2");m&&(m.style.display="block")}else console.error("CRITICAL: booking-confirmation container not found!")}function St(){sessionStorage.getItem("bookingType"),B&&_e()}function kt(){const e=document.getElementById("trip-share-link"),o=document.getElementById("copy-feedback");e.select(),e.setSelectionRange(0,99999),navigator.clipboard.writeText(e.value).then(()=>{o.style.display="flex",setTimeout(()=>{o.style.display="none"},3e3)}).catch(t=>{console.error("Failed to copy:",t),alert("Failed to copy link. Please copy manually.")})}function wt(){const e=document.getElementById("trip-share-link").value,t=`🚖 Join my trip on TeksiMap!

Route: ${M[B].name}
Seats Available: ${15-$}

Only logged-in users can join. Click the link below:
${e}`,i=`https://wa.me/?text=${encodeURIComponent(t)}`;window.open(i,"_blank")}function It(){const e=document.getElementById("trip-share-link").value,o=M[B],t=`Join my trip: ${o.name}`,i=`Hi!

I've created a trip on TeksiMap and I'd like to invite you to join.

Route: ${o.name}
Seats Available: ${15-$}

Note: You need to be logged in to TeksiMap to join this trip.

Join here: ${e}

See you on the trip!`,a=`mailto:?subject=${encodeURIComponent(t)}&body=${encodeURIComponent(i)}`;window.location.href=a}function Pt(){const e=document.getElementById("trip-share-link").value,t=`Join my trip on TeksiMap! Route: ${M[B].name}. ${15-$} seats available. Login required: ${e}`,i=`sms:?body=${encodeURIComponent(t)}`;window.location.href=i}function xt(){const e=document.getElementById("trip-share-link").value,o=document.getElementById("qr-modal"),t=document.getElementById("qr-code-container");t.innerHTML="";const i=`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(e)}`,a=document.createElement("img");a.src=i,a.alt="Trip QR Code",a.style.width="250px",a.style.height="250px",a.style.borderRadius="12px",t.appendChild(a),o.style.display="flex"}function _t(){document.getElementById("qr-modal").style.display="none"}function $t(){const o=new URLSearchParams(window.location.search).get("join");if(o){if(!Et()){alert("Please log in to join this trip."),window.location.href=`/pages/authentication/login.html?returnUrl=${encodeURIComponent(window.location.href)}`;return}alert(`Attempting to join trip: ${o}

In production, this would fetch the trip details from the backend and add you as a participant.`)}}function Et(){return!!(localStorage.getItem("authToken")||sessionStorage.getItem("authToken"))}function Ct(){_e()}function _e(){console.log("showPaymentStep() called - hiding booking summary, showing payment"),qe();const e=document.getElementById("step3"),o=document.getElementById("step4");e&&(e.classList.remove("active"),e.classList.add("completed")),o&&o.classList.add("active"),_=5,document.querySelectorAll(".booking-content").forEach(s=>{s.classList.remove("active"),s.style.display="none",s.style.visibility="hidden"});const t=document.getElementById("booking-confirmation");t&&(t.classList.remove("active"),t.style.display="none",t.style.visibility="hidden",t.style.opacity="0",console.log("Booking summary (booking-confirmation) is now hidden"));const i=document.getElementById("payment-step");i?(i.classList.add("active"),i.style.display="block",i.style.visibility="visible",i.style.opacity="1",console.log("Payment step is now visible")):console.error("CRITICAL: payment-step container not found!"),Bt(),V="yoco";const a=document.getElementById("pay-button");a&&(a.disabled=!1),Lt()}function Lt(){const e=document.getElementById("card-number");e&&e.addEventListener("input",function(t){var s;let i=t.target.value.replace(/\s/g,""),a=((s=i.match(/.{1,4}/g))==null?void 0:s.join(" "))||i;t.target.value=a});const o=document.getElementById("card-expiry");o&&o.addEventListener("input",function(t){let i=t.target.value.replace(/\D/g,"");i.length>=2&&(i=i.slice(0,2)+"/"+i.slice(2,4)),t.target.value=i})}let V=null;const ke="pk_test_660c6ab0kwjeRzEb28d4",$e=ke.trim()!==""&&ke.startsWith("pk_");function Nt(e){if(e==="yoco"&&!$e){alert("Yoco payment gateway is not configured. Please configure your Yoco public key in booking-public.js, or use a different payment method.");return}V=e,document.querySelectorAll(".payment-method-card").forEach(s=>{s.classList.remove("selected")}),document.querySelectorAll(".payment-form").forEach(s=>{s.classList.remove("show")});const o=document.querySelector('.payment-method-card[onclick*="'+e+'"]');o&&o.classList.add("selected");const t=e+"-form",i=document.getElementById(t);i&&i.classList.add("show");const a=document.getElementById("pay-button");a&&(a.disabled=!1)}function Bt(){var l;if(!B)return;let e="",o=450;if(r)r.direction_type==="from_loc1"?e=`${r.location_1} → ${r.location_2}`:r.direction_type==="from_loc2"?e=`${r.location_2} → ${r.location_1}`:e=`${r.location_1} → ${r.location_2}`,o=parseFloat(r.base_fare)||450;else if(M[B]){const d=M[B];e=d.name,o=d.price||450}const t=sessionStorage.getItem("bookingType")||L,i=parseInt(sessionStorage.getItem("passengerCount")||$)||$,a=parseInt(sessionStorage.getItem("parcelCount")||E)||E,s=parseFloat(o)||0;let n=0;if(t==="parcels"){const d=JSON.parse(sessionStorage.getItem("parcelData")||JSON.stringify(v))||v,I=(r==null?void 0:r.small_parcel_price)!=null?parseFloat(r.small_parcel_price):U.small,h=(r==null?void 0:r.medium_parcel_price)!=null?parseFloat(r.medium_parcel_price):U.medium,w=(r==null?void 0:r.large_parcel_price)!=null?parseFloat(r.large_parcel_price):U.large;console.log("Payment summary - Using parcel prices from selected booking:",{small:I,medium:h,large:w,seatPrice:s});for(let y=1;y<=a;y++)d[y]&&d[y].size&&(d[y].isSeatParcel?n+=s:d[y].size==="large"?n+=w:d[y].size==="medium"?n+=h:d[y].size==="small"&&(n+=I));n=parseFloat(n)||0}else n=s*i;const c=document.getElementById("summary-route"),p=document.getElementById("summary-passengers"),u=document.getElementById("summary-total");if(c==null||c.closest(".booking-summary-card"),c&&(c.textContent=e||"-"),p){const d=(l=p.parentElement)==null?void 0:l.querySelector("span:first-child");d?t==="parcels"?(d.textContent="Parcels:",p.textContent=a||0):(d.textContent="Passengers:",p.textContent=i):t==="parcels"?p.textContent=a||0:p.textContent=i}if(u){const d=parseFloat(n)||0;u.textContent=`R${d.toFixed(2)}`,console.log("Payment summary - Total amount for "+t+":",d)}const f="TKS"+Date.now().toString().slice(-8),m=document.getElementById("payment-reference");m&&(m.value=f)}function Tt(){if(V||(V="yoco"),V==="yoco"){Dt();return}alert("Payment method not available. Please refresh the page and try again.")}function Dt(){var m;const e=document.getElementById("summary-total");if(!e){alert("Unable to retrieve payment amount. Please try again.");return}const o=e.textContent.replace(/[R\s,]/g,""),t=parseFloat(o),i=Math.round(t*100);if(console.log("Yoco Payment - Amount extraction:",{summaryText:e.textContent,amountText:o,amountInRands:t,amountInCents:i}),!i||i<=0||isNaN(i)){alert("Invalid payment amount: R"+t+". Please check your booking and try again."),console.error("Invalid payment amount detected:",{amountInRands:t,amountInCents:i});return}const a=((m=document.getElementById("summary-route"))==null?void 0:m.textContent)||"Booking Payment",s=sessionStorage.getItem("bookingType")||L,n=parseInt(sessionStorage.getItem("passengerCount")||$)||$,c=parseInt(sessionStorage.getItem("parcelCount")||E)||E,p=s==="parcels"?`${c} Parcel(s) - ${a}`:`${n} Passenger(s) - ${a}`;if(!$e){alert("Yoco payment gateway is not configured. Please configure your Yoco public key in the code, or use a different payment method."),console.warn("Yoco payment attempted but Yoco is not enabled. Set YOCO_PUBLIC_KEY in booking-public.js");return}const u=ke,f=()=>{if(typeof window.YocoSDK>"u"){console.error("Yoco SDK not loaded"),console.log("Available window properties:",Object.keys(window).filter(l=>l.toLowerCase().includes("yoco"))),alert("Payment gateway is not available. Please refresh the page and try again.");return}try{console.log("Initializing Yoco SDK with public key:",u.substring(0,10)+"...");const l=new window.YocoSDK({publicKey:u});if(!l)throw new Error("Failed to initialize Yoco SDK - yoco object is null/undefined");if(console.log("Yoco SDK initialized. Available methods:",Object.keys(l)),typeof l.showPopup!="function")if(console.error("Yoco object methods:",Object.keys(l)),console.error("Yoco object:",l),typeof l.checkout=="function")console.warn("showPopup not found, trying checkout method...");else throw new Error("Yoco showPopup method not available. Available methods: "+Object.keys(l).join(", "));console.log("Opening Yoco payment popup with amount:",i,"cents");const I={amountInCents:i,currency:"ZAR",name:"TekSiMap Booking",description:p,callback:function(h){console.log("Yoco callback received:",h);const w=document.getElementById("pay-button");w&&(w.disabled=!0,w.innerHTML='<i class="ri-loader-4-line"></i> Processing Payment...'),h.error?(console.error("Yoco payment error:",h.error),alert("Payment failed: "+(h.error.message||"An error occurred. Please try again.")),w&&(w.disabled=!1,w.innerHTML='<i class="ri-bank-card-line"></i> Pay Now')):(console.log("Yoco payment successful:",h),h.token&&sessionStorage.setItem("yocoPaymentToken",h.token),h.id&&sessionStorage.setItem("yocoPaymentId",h.id),h&&sessionStorage.setItem("yocoPaymentResponse",JSON.stringify(h)),V="yoco",At())}};console.log("Yoco popup config:",I),l.showPopup(I)}catch(l){console.error("Error initializing Yoco checkout:",l),console.error("Error details:",{message:l.message,stack:l.stack,yocoSDKAvailable:typeof window.YocoSDK<"u",yocoSDKType:typeof window.YocoSDK,yocoSDKConstructor:window.YocoSDK?window.YocoSDK.toString().substring(0,200):"N/A"}),alert("Unable to initialize payment gateway: "+(l.message||"Unknown error")+". Please try again or use a different payment method.")}};if(typeof window.YocoSDK>"u"){console.log("Yoco SDK not immediately available, waiting for it to load...");let l=0;const d=50,I=setInterval(()=>{l++,typeof window.YocoSDK<"u"?(clearInterval(I),console.log("Yoco SDK loaded after",l*100,"ms"),f()):l>=d&&(clearInterval(I),alert("Payment gateway is taking too long to load. Please refresh the page and try again."),console.error("Yoco SDK failed to load after 5 seconds"),console.error("Window.YocoSDK:",window.YocoSDK),console.error('Available window properties with "yoco":',Object.keys(window).filter(h=>h.toLowerCase().includes("yoco"))))},100)}else console.log("Yoco SDK is available, proceeding immediately"),f()}async function At(){var S,x,N,T,P;const e=document.getElementById("payment-content");e&&(e.style.display="none");const o=document.getElementById("payment-success");o&&o.classList.add("show"),Rt(),JSON.parse(sessionStorage.getItem("selectedVehicle")||"{}");let t="",i=450,a="10:00 am";if(r)r.direction_type==="from_loc1"?t=`${r.location_1} → ${r.location_2}`:r.direction_type==="from_loc2"?t=`${r.location_2} → ${r.location_1}`:t=`${r.location_1} → ${r.location_2}`,i=parseFloat(r.base_fare)||450,r.scheduled_pickup&&(a=new Date(r.scheduled_pickup).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0}));else if(B&&M&&M[B]){const g=M[B];if(t=g.name||"Route not selected",i=g.price||450,g.departure){const b=g.departure.match(/(\d{1,2}:\d{2}\s*(?:am|pm))/i);b&&(a=b[1])}}else console.warn("No route data available. Using defaults."),t="Route information unavailable",i=450;const s=sessionStorage.getItem("bookingType")||L;if(s!=="passengers"&&s!=="parcels"){console.error("Invalid booking type:",s),alert("Error: Invalid booking type. Please select either passenger or parcel booking.");return}const n=s==="passengers"&&$>0,c=s==="parcels"&&E>0;if(n&&c){console.error("Both passengers and parcels detected - this should not happen"),alert("Error: Cannot book both passengers and parcels at the same time. Please select only one booking type.");return}if(!n&&!c){console.error("No passengers or parcels to book"),alert("Error: Please select at least 1 passenger or 1 parcel to book.");return}const p=parseFloat(i)||0;let u=0;if(s==="parcels"){const g=(r==null?void 0:r.small_parcel_price)!=null?parseFloat(r.small_parcel_price):U.small,b=(r==null?void 0:r.medium_parcel_price)!=null?parseFloat(r.medium_parcel_price):U.medium,C=(r==null?void 0:r.large_parcel_price)!=null?parseFloat(r.large_parcel_price):U.large;console.log("Payment completion - Using parcel prices from selected booking:",{small:g,medium:b,large:C,seatPrice:p,selectedBookingId:r==null?void 0:r.ID});for(let k=1;k<=E;k++)v[k]&&v[k].size&&(v[k].isSeatParcel?u+=p:v[k].size==="large"?u+=C:v[k].size==="medium"?u+=b:v[k].size==="small"&&(u+=g));u=parseFloat(u)||0}else u=p*$;const f=s==="passengers"?JSON.parse(sessionStorage.getItem("passengerData")||"[]"):[],m=[];if(F.forEach((g,b)=>{m.push({point_type:"pickup",point_name:g.address||`Pickup Point ${b+1}`,address:g.address,coordinates:g.coordinates||(g.lat&&g.lng?{lat:g.lat,lng:g.lng}:null),order_index:b+1,expected_time:j||new Date(Date.now()+7*24*60*60*1e3).toISOString()})}),z.forEach((g,b)=>{m.push({point_type:"dropoff",point_name:g.address||`Dropoff Point ${b+1}`,address:g.address,coordinates:g.coordinates||(g.lat&&g.lng?{lat:g.lat,lng:g.lng}:null),order_index:F.length+b+1,expected_time:j||new Date(Date.now()+7*24*60*60*1e3).toISOString()})}),!r||!r.ID){console.error("No booking selected. A booking must be selected before payment."),alert("Error: No booking selected. Please select a booking from the route selection step.");return}console.log("Updating existing booking:",r.ID);const l={id:r.ID,booking_reference:r.booking_reference||r.booking_ref||"TKS"+Date.now().toString().slice(-8),owner_id:r.owner_id,vehicle_id:r.vehicle_id,booking_status:r.booking_status||"pending"};let d=null;if(s==="parcels"){if($>0)throw console.error("Parcel booking detected but passenger count > 0 - this should not happen"),new Error("Cannot add parcels when passengers are selected. Please select only one booking type.");const g=JSON.parse(sessionStorage.getItem("parcelData")||"{}"),b=[];for(let J=1;J<=E;J++){const D=g[J];D&&D.size&&b.push({size:D.size||"small",weight:D.weight||null,images:D.images||[],isSeatParcel:D.isSeatParcel||!1})}const C=F.length>0?F[0]:null,k=z.length>0?z[0]:null;let A=null;C&&(A={address:C.address||null,lat:C.lat||(C.coordinates&&Array.isArray(C.coordinates)?C.coordinates[1]:null),lng:C.lng||(C.coordinates&&Array.isArray(C.coordinates)?C.coordinates[0]:null),coordinates:C.coordinates||(C.lat&&C.lng?[C.lng,C.lat]:null)});let q=null;k&&(q={address:k.address||null,lat:k.lat||(k.coordinates&&Array.isArray(k.coordinates)?k.coordinates[1]:null),lng:k.lng||(k.coordinates&&Array.isArray(k.coordinates)?k.coordinates[0]:null),coordinates:k.coordinates||(k.lat&&k.lng?[k.lng,k.lat]:null)}),d={sender_name:R.senderName||"",sender_phone:R.senderPhone||"",receiver_name:K.receiverName||"",receiver_phone:K.receiverPhone||"",parcels:b,pickup_point:A,dropoff_point:q,pickup_address:(A==null?void 0:A.address)||null,dropoff_address:(q==null?void 0:q.address)||null}}else if(s==="passengers"&&E>0)throw console.error("Passenger booking detected but parcel count > 0 - this should not happen"),new Error("Cannot process passenger booking when parcels are selected. Please select only one booking type.");try{let g=V||"EFT";g==="yoco"&&(g="card");const b=sessionStorage.getItem("yocoPaymentToken"),C=sessionStorage.getItem("yocoPaymentId"),k=sessionStorage.getItem("yocoPaymentResponse");let A=null;if(g==="card"&&b&&(A={token:b,id:C,gateway:"yoco",timestamp:new Date().toISOString()},k))try{const D=JSON.parse(k);A={...A,...D}}catch(D){console.warn("Could not parse Yoco payment response:",D)}let q=null;if(s==="passengers"){if(E>0)throw console.error("Passenger booking detected but parcels also present - this should not happen"),new Error("Cannot process passenger booking when parcels are selected. Please select only one booking type.");if(f&&f.length>0){const D=f[0];q={first_name:D.firstName,last_name:D.lastName,email:D.email||null,phone:D.phone||null,id_number:D.idNumber||null,pickup_point:F[0]||null,dropoff_point:z[0]||null,next_of_kin_first_name:((S=D.nextOfKin)==null?void 0:S.firstName)||"",next_of_kin_last_name:((x=D.nextOfKin)==null?void 0:x.lastName)||"",next_of_kin_phone:((N=D.nextOfKin)==null?void 0:N.phone)||"",is_primary:!0}}else throw new Error("No passenger data found for passenger booking.")}else if(s==="parcels"&&($>0||f&&f.length>0))throw console.error("Parcel booking detected but passengers also present - this should not happen"),new Error("Cannot process parcel booking when passengers are selected. Please select only one booking type.");const J=await We({booking_id:l.id,amount:u,payment_method:g,transaction_id:C||null,payment_gateway:"yoco",gateway_response:A,passenger_data:q,parcel_data:d});if(s==="parcels"&&J){const D=((T=J.data)==null?void 0:T.parcel)||J.parcel;if(D&&(D.sender_code||D.receiver_code)){const ce={sender_code:D.sender_code||null,receiver_code:D.receiver_code||null};sessionStorage.setItem("parcelCodes",JSON.stringify(ce)),console.log("Stored parcel verification codes:",ce)}}b&&sessionStorage.removeItem("yocoPaymentToken"),C&&sessionStorage.removeItem("yocoPaymentId"),k&&sessionStorage.removeItem("yocoPaymentResponse")}catch(g){throw console.error("Error creating payment for existing booking:",g),g.response?console.error("Payment API Error Details:",{status:g.response.status,statusText:g.response.statusText,data:g.response.data,url:(P=g.config)==null?void 0:P.url}):g.request?console.error("Payment API Request Error - No response received:",g.request):console.error("Payment API Error:",g.message),g}let I=null;if(s==="parcels"){const g=JSON.parse(sessionStorage.getItem("parcelData")||"{}");I={},Object.keys(g).forEach(b=>{const C=g[b];I[b]={size:C.size||"small",images:C.images||[]}}),sessionStorage.setItem("sharedSenderInfo",JSON.stringify(R)),sessionStorage.setItem("sharedReceiverInfo",JSON.stringify(K))}let h=null;s==="passengers"&&(h=fe());const w={id:(l==null?void 0:l.id)||"BK"+Date.now(),booking_id:l==null?void 0:l.id,reference:(l==null?void 0:l.booking_reference)||"TKS"+Date.now().toString().slice(-8),routeId:B,routeName:t,bookingType:s,passengers:s==="parcels"?0:$,parcels:s==="parcels"&&E||0,parcelData:I,seatSecretCode:h,pricePerPerson:i,totalAmount:u,pickupPoints:F.map(g=>({address:g.address,lat:g.lat,lng:g.lng})),dropoffPoints:z.map(g=>({address:g.address,lat:g.lat,lng:g.lng})),tripDate:j||new Date(Date.now()+7*24*60*60*1e3).toISOString(),bookingDate:new Date().toISOString(),status:"paid",booking_status:"paid",paymentMethod:V,paymentDate:new Date().toISOString()},y=JSON.parse(localStorage.getItem("userBookings")||"[]");if(y.push(w),localStorage.setItem("userBookings",JSON.stringify(y)),localStorage.setItem("completedBooking",JSON.stringify(w)),sessionStorage.setItem("currentBooking",JSON.stringify(w)),s==="passengers"){const g={routeId:B,routeName:t,passengers:$,seatSecretCode:w.seatSecretCode,pickupPoints:F.map(b=>({address:b.address,lat:b.lat,lng:b.lng})),dropoffPoints:z.map(b=>({address:b.address,lat:b.lat,lng:b.lng})),createdAt:new Date().toISOString(),bookingId:w.id,bookingReference:w.reference,paymentMethod:w.paymentMethod,paymentDate:w.paymentDate,status:"paid",tripTime:j||a};localStorage.setItem("activeTripData",JSON.stringify(g))}localStorage.setItem("completedBooking",JSON.stringify(w))}function Rt(){const e=document.getElementById("vehicle-image-container"),o=document.getElementById("blur-overlay"),t=document.getElementById("vehicle-details");e&&e.classList.add("revealed"),o&&o.classList.add("hidden"),t&&t.classList.add("revealed")}function Mt(){const e=document.getElementById("step4"),o=document.getElementById("step3");e&&e.classList.remove("active"),o&&(o.classList.remove("completed"),o.classList.add("active")),_=3;const t=document.getElementById("payment-step");t&&t.classList.remove("active");const i=document.getElementById("booking-confirmation");i&&i.classList.add("active"),V=null;const a=document.getElementById("pay-button");a&&(a.disabled=!0),document.querySelectorAll(".payment-form").forEach(s=>{s.classList.remove("show")}),document.querySelectorAll(".payment-method-card").forEach(s=>{s.classList.remove("selected")})}function Ft(){confirm("Are you sure you want to cancel this trip? This action cannot be undone.")&&(localStorage.removeItem("activeTripData"),alert("Trip cancelled successfully."),window.location.href="/pages/customer/booking-type-selection.html")}function Ot(){document.getElementById("mobileMenu").classList.toggle("show")}function zt(){}window.selectRoute=tt;window.nextStep=ge;window.goBack=ot;window.addPickupPoint=nt;window.addDropoffPoint=st;window.removeLocation=at;window.continueTripSelection=it;window.updatePassengerInfo=Se;window.confirmBooking=St;window.proceedToPayment=Ct;window.selectPaymentMethodInBooking=Nt;window.processPaymentInBooking=Tt;window.goBackFromPayment=Mt;window.cancelTrip=Ft;window.toggleMobileMenu=Ot;window.topNavZIndexDecrease=zt;window.incrementPassengersPublic=pt;window.decrementPassengersPublic=mt;window.incrementParcelsPublic=ut;window.decrementParcelsPublic=gt;window.updateParcelFieldPublic=vt;window.handleParcelImageUploadPublic=ht;window.removeParcelImagePublic=bt;window.validatePhoneInputPublic=rt;window.validateAndProceed=dt;window.copyTripLink=kt;window.shareViaWhatsApp=wt;window.shareViaEmail=It;window.shareViaSMS=Pt;window.showQRCode=xt;window.closeQRModal=_t;function qt(){const e=localStorage.getItem("activeTripData");if(e)try{JSON.parse(e).passengers>=15&&localStorage.removeItem("activeTripData")}catch(o){console.error("Error parsing active trip data:",o),localStorage.removeItem("activeTripData")}}function Ht(){window.location.href="trip-status.html"}async function Me(){try{const e=await Ve();if(!e.success||!e.bookings||e.bookings.length===0)return;const o=new Date,i=e.bookings.map(n=>{let c=n.route_name;!c&&n.location_1&&n.location_2&&(n.direction_type==="from_loc2"?c=`${n.location_2} → ${n.location_1}`:c=`${n.location_1} → ${n.location_2}`);let p=[],u=[];if(n.route_points)try{const d=typeof n.route_points=="string"?JSON.parse(n.route_points):n.route_points;Array.isArray(d)&&d.forEach(I=>{var h,w,y,S;I.point_type==="pickup"?p.push({address:I.address||I.point_name,lat:((h=I.coordinates)==null?void 0:h.lat)||null,lng:((w=I.coordinates)==null?void 0:w.lng)||null}):I.point_type==="dropoff"&&u.push({address:I.address||I.point_name,lat:((y=I.coordinates)==null?void 0:y.lat)||null,lng:((S=I.coordinates)==null?void 0:S.lng)||null})})}catch(d){console.error("Error parsing route_points:",d)}n.pickup_point&&!p.length&&p.push({address:n.pickup_address||"Pickup location",lat:n.pickup_point.lat,lng:n.pickup_point.lng}),n.dropoff_point&&!u.length&&u.push({address:n.dropoff_address||"Dropoff location",lat:n.dropoff_point.lat,lng:n.dropoff_point.lng});const f=n.booking_type||(n.passenger_count>0?"passenger":"parcel");let m=0;if(f==="passenger")m=n.base_fare?parseFloat(n.base_fare):n.total_amount_needed?parseFloat(n.total_amount_needed)/Math.max(n.passenger_count||1,1):0;else{const d=n.parcel_count||0;d>0&&(m=parseFloat(n.total_amount_paid||n.total_amount_needed||0)/d)}let l;return f==="passenger"?l=n.passenger_record_id?`passenger-${n.ID}-${n.passenger_record_id}`:`passenger-${n.ID}`:l=n.parcel_record_id?`parcel-${n.ID}-${n.parcel_record_id}`:`parcel-${n.ID}`,{id:l,bookingId:n.ID,reference:n.booking_reference,routeName:c||"Unknown Route",status:n.booking_status,bookingType:f,passengers:n.passenger_count||0,parcels:n.parcel_count||0,totalAmount:parseFloat(n.payment_amount!==void 0?n.payment_amount:n.total_amount_paid||n.total_amount_needed||0),pricePerPerson:m,tripDate:n.scheduled_pickup,bookingDate:n.created_at,pickupPoints:p,dropoffPoints:u,passengerRecordId:n.passenger_record_id||null,parcelRecordId:n.parcel_record_id||null,sender_name:n.sender_name||null,sender_phone:n.sender_phone||null,receiver_name:n.receiver_name||null,receiver_phone:n.receiver_phone||null,sender_code:n.sender_code||null,receiver_code:n.receiver_code||null,parcel_status:n.parcel_status||null}}),a=i.filter(n=>n.status==="paid"||n.status==="pending"),s=i.filter(n=>(n.status==="completed"||n.status==="cancelled"||n.status==="refunded"||n.status==="confirmed")&&!(n.status==="paid"||n.status==="pending"));document.getElementById("upcoming-count").textContent=a.length,document.getElementById("history-count").textContent=s.length,Ne("upcoming-bookings",a,"upcoming"),Ne("history-bookings",s,"history"),document.getElementById("your-bookings-section").style.display="block"}catch(e){console.error("Error loading user bookings:",e)}}function Ne(e,o,t){const i=document.getElementById(e);if(i){if(o.length===0){i.innerHTML=Kt(t);return}i.innerHTML=o.map(a=>Yt(a,t)).join("")}}function Kt(e){const t={upcoming:{icon:"ri-calendar-check-line",title:"No Upcoming Trips",text:"You don't have any upcoming paid trips."},history:{icon:"ri-history-line",title:"No Trip History",text:"You haven't completed any trips yet."}}[e];return`
        <div class="empty-bookings-message">
            <i class="${t.icon}"></i>
            <h4>${t.title}</h4>
            <p>${t.text}</p>
        </div>
    `}function Yt(e,o){const t=e.status==="paid"?"paid":"completed";e.status;const i=e.bookingType||(e.passengers>0?"passenger":"parcel"),a=i==="parcel",s=new Date(e.tripDate),n=new Date(e.bookingDate),c=isNaN(s.getTime())?"Date not set":`${s.toLocaleDateString()} ${s.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`,p=o==="upcoming"&&(e.status==="paid"||e.status==="pending"),u=p&&!a?Math.max(0,15-(e.passengers||0)):0,f=a?"ri-box-3-line":"ri-taxi-line",m=a?"Parcel Booking":"Taxi Booking";return`
        <div class="booking-item ${t} ${a?"parcel-booking":"passenger-booking"}">
            ${p?`
            <div class="active-trip-banner" style="margin-bottom: 1rem;">
                <div class="active-trip-content">
                    <div class="active-trip-icon">
                        <i class="ri-time-line"></i>
                    </div>
                    <div class="active-trip-info">
                        <h3><i class="ri-information-line"></i> You Have an Active ${a?"Parcel":"Trip"}</h3>
                        <p>Your ${a?"parcel booking":"trip"} from <strong>${e.routeName||"N/A"}</strong> ${e.status==="pending"?"is pending confirmation.":"is active."}</p>
                        <div class="active-trip-stats">
                            ${a?`<span><i class="ri-box-3-line"></i> <strong>${e.parcels||0}</strong> parcel${(e.parcels||0)!==1?"s":""}</span>`:`<span><i class="ri-user-line"></i> <strong>${e.passengers||0}</strong> passenger${(e.passengers||0)!==1?"s":""}</span>`}
                            ${u>0?`<span><i class="ri-user-add-line"></i> <strong>${u}</strong> seats available</span>`:""}
                        </div>
                    </div>
                    <div class="active-trip-actions">
                        <button class="btn-view-trip" onclick="window.location.href='trip-status.html?bookingId=${e.bookingId}${e.passengerRecordId?`&passengerRecordId=${e.passengerRecordId}`:""}${e.parcelRecordId?`&parcelRecordId=${e.parcelRecordId}`:""}&bookingType=${i}'">
                            <i class="ri-eye-line"></i> View ${a?"Parcel":"Trip"} Status
                        </button>
                    </div>
                </div>
            </div>
            `:""}
            <div class="booking-item-header" data-booking-id="${String(e.id)}" onclick="window.toggleBookingDetailsView && window.toggleBookingDetailsView('${String(e.id)}'); return false;">
                <div class="booking-item-title">
                    <h3><i class="${f}"></i> ${e.routeName||m} ${a?'<span style="background: #7b1fa2; color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; margin-left: 0.5rem;">PARCEL</span>':""}</h3>
                    <div class="booking-reference">Ref: ${e.reference}</div>
                </div>
                <div class="booking-expand-icon" id="expand-icon-${String(e.id)}">
                    <i class="ri-arrow-down-s-line"></i>
                </div>
            </div>
            
            <div class="booking-item-quick-info">
                <div class="quick-info-item">
                    <i class="ri-calendar-line"></i>
                    <span>${s.toLocaleDateString()}</span>
                </div>
                <div class="quick-info-item">
                    <i class="${a?"ri-box-3-line":"ri-group-line"}"></i>
                    <strong>${a?e.parcels||0:e.passengers}</strong> ${a?(e.parcels||0)===1?"parcel":"parcels":e.passengers===1?"person":"people"}
                </div>
                <div class="quick-info-item">
                    <i class="ri-money-dollar-circle-line"></i>
                    <strong>R${parseFloat(e.totalAmount).toFixed(2)}</strong>
                </div>
            </div>
            
            <div class="booking-item-details" id="booking-details-${String(e.id)}">
                <div class="booking-details-grid">
                    <div class="booking-detail">
                        <div class="booking-detail-label">Trip Date & Time</div>
                        <div class="booking-detail-value">
                            <i class="ri-calendar-event-line"></i>
                            ${c}
                        </div>
                    </div>
                    ${a?`
                    <div class="booking-detail">
                        <div class="booking-detail-label">Number of Parcels</div>
                        <div class="booking-detail-value">
                            <i class="ri-box-3-line"></i>
                            ${e.parcels||0} ${(e.parcels||0)===1?"parcel":"parcels"}
                        </div>
                    </div>
                    `:`
                    <div class="booking-detail">
                        <div class="booking-detail-label">Number of Passengers</div>
                        <div class="booking-detail-value">
                            <i class="ri-group-line"></i>
                            ${e.passengers} ${e.passengers===1?"person":"people"}
                        </div>
                    </div>
                    `}
                    <div class="booking-detail">
                        <div class="booking-detail-label">Total Amount</div>
                        <div class="booking-detail-value">
                            <i class="ri-money-dollar-circle-line"></i>
                            R${parseFloat(e.totalAmount).toFixed(2)}
                        </div>
                    </div>
                    <div class="booking-detail">
                        <div class="booking-detail-label">Booking Date</div>
                        <div class="booking-detail-value">
                            <i class="ri-time-line"></i>
                            ${n.toLocaleDateString()}
                        </div>
                    </div>
                    ${a&&e.sender_code?`
                    <div class="booking-detail">
                        <div class="booking-detail-label">Sender Code</div>
                        <div class="booking-detail-value">
                            <i class="ri-qr-code-line"></i>
                            <strong style="font-size: 1.1rem; letter-spacing: 2px;">${e.sender_code}</strong>
                        </div>
                    </div>
                    `:""}
                    ${a&&e.receiver_code?`
                    <div class="booking-detail">
                        <div class="booking-detail-label">Receiver Code</div>
                        <div class="booking-detail-value">
                            <i class="ri-qr-code-line"></i>
                            <strong style="font-size: 1.1rem; letter-spacing: 2px;">${e.receiver_code}</strong>
                        </div>
                    </div>
                    `:""}
                    ${a&&e.sender_name?`
                    <div class="booking-detail">
                        <div class="booking-detail-label">Sender</div>
                        <div class="booking-detail-value">
                            <i class="ri-user-line"></i>
                            ${e.sender_name}${e.sender_phone?` (${e.sender_phone})`:""}
                        </div>
                    </div>
                    `:""}
                    ${a&&e.receiver_name?`
                    <div class="booking-detail">
                        <div class="booking-detail-label">Receiver</div>
                        <div class="booking-detail-value">
                            <i class="ri-user-line"></i>
                            ${e.receiver_name}${e.receiver_phone?` (${e.receiver_phone})`:""}
                        </div>
                    </div>
                    `:""}
                </div>
                
                ${Jt(e)}
                
                <div class="booking-item-actions">
                    ${jt(e,o)}
                </div>
            </div>
        </div>
    `}function Jt(e){let o="";return e.pickupPoints&&e.pickupPoints.length>0&&(o+=`
            <div class="booking-locations-section">
                <h4><i class="ri-map-pin-user-fill"></i> Pickup Points</h4>
                ${e.pickupPoints.map(t=>`
                    <div class="location-item">
                        <i class="ri-map-pin-fill"></i>
                        ${t.address||"Location not specified"}
                    </div>
                `).join("")}
            </div>
        `),e.dropoffPoints&&e.dropoffPoints.length>0&&(o+=`
            <div class="booking-locations-section">
                <h4><i class="ri-map-pin-3-fill"></i> Drop-off Points</h4>
                ${e.dropoffPoints.map(t=>`
                    <div class="location-item">
                        <i class="ri-map-pin-fill"></i>
                        ${t.address||"Location not specified"}
                    </div>
                `).join("")}
            </div>
        `),o}function jt(e,o){let t="";return o!=="upcoming"&&(t+=`
            <button class="booking-action-btn secondary" onclick="viewBookingOnMap('${e.id}')">
                <i class="ri-map-pin-line"></i> View on Map
            </button>
        `),t}function Ut(){const e=document.querySelectorAll(".booking-tab-btn");e.forEach(o=>{o.addEventListener("click",()=>{const t=o.getAttribute("data-tab");e.forEach(a=>a.classList.remove("active")),o.classList.add("active"),document.querySelectorAll(".booking-tab-content-area").forEach(a=>a.classList.remove("active"));const i=document.getElementById(t);i&&i.classList.add("active")})})}function Vt(e){const o=String(e),t=document.getElementById(`booking-details-${o}`),i=document.getElementById(`expand-icon-${o}`);if(t){const a=t.classList.toggle("show");if(i){const s=i.querySelector("i");s&&(a?s.style.transform="rotate(180deg)":s.style.transform="rotate(0deg)")}}}function Wt(e){const t=JSON.parse(localStorage.getItem("userBookings")||"[]").find(i=>i.id===e);if(!t){alert("Booking not found");return}localStorage.setItem("paymentData",JSON.stringify({bookingId:t.id,routeName:t.routeName,passengers:t.passengers,pricePerPerson:t.pricePerPerson,totalAmount:t.totalAmount,pickupPoints:t.pickupPoints||[],dropoffPoints:t.dropoffPoints||[]})),window.location.href="/pages/customer/booking-payment.html"}function Gt(e){if(!confirm("Are you sure you want to cancel this booking? This action cannot be undone."))return;let o=JSON.parse(localStorage.getItem("userBookings")||"[]");o=o.filter(t=>t.id!==e),localStorage.setItem("userBookings",JSON.stringify(o)),Me(),alert("Booking cancelled successfully")}function Qt(e){const t=JSON.parse(localStorage.getItem("userBookings")||"[]").find(i=>i.id===e);if(!t){alert("Booking not found");return}alert(`Booking Details:

Reference: ${t.reference}
Route: ${t.routeName}
Passengers: ${t.passengers}
Total: R${t.totalAmount}

In a future update, this will show the route on an interactive map.`)}window.viewActiveTrip=Ht;window.toggleBookingDetailsView=Vt;window.payForExistingBooking=Wt;window.cancelExistingBooking=Gt;window.viewBookingOnMap=Qt;let ae=[];function Zt(){const e=document.getElementById("notificationsDropdown");if(e){const o=e.style.display==="block";e.style.display=o?"none":"block",o?document.removeEventListener("click",we):(Fe(),setTimeout(()=>{document.addEventListener("click",we)},100))}}function we(e){const o=document.getElementById("notificationsDropdown"),t=document.getElementById("notificationBell");o&&t&&!o.contains(e.target)&&!t.contains(e.target)&&(o.style.display="none",document.removeEventListener("click",we))}function Fe(){ae=JSON.parse(localStorage.getItem("userNotifications")||"[]"),Oe(),ze()}function Oe(){const e=document.getElementById("notificationsList");if(e){if(ae.length===0){e.innerHTML=`
            <div class="no-notifications">
                <i class="ri-notification-off-line"></i>
                <p>No notifications</p>
            </div>
        `;return}e.innerHTML=ae.map(o=>{const t=Xt(o.time);return`
            <div class="notification-item ${o.read?"":"unread"}" onclick="markNotificationAsRead('${o.id}')">
                <div class="notification-icon default">
                    <i class="ri-information-line"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${o.title}</div>
                    <div class="notification-message">${o.message}</div>
                    <div class="notification-time">
                        <i class="ri-time-line"></i> ${t}
                    </div>
                    ${actionButtons}
                </div>
            </div>
        `}).join("")}}function Xt(e){const o=new Date,t=new Date(e),i=o-t,a=Math.floor(i/6e4),s=Math.floor(i/36e5),n=Math.floor(i/864e5);return a<1?"Just now":a<60?`${a} minute${a>1?"s":""} ago`:s<24?`${s} hour${s>1?"s":""} ago`:n<7?`${n} day${n>1?"s":""} ago`:t.toLocaleDateString()}function ze(){const e=document.getElementById("notificationBadge");if(!e)return;const o=ae.filter(t=>!t.read).length;o>0?(e.textContent=o>99?"99+":o,e.style.display="flex"):e.style.display="none"}function eo(e){const o=ae.find(t=>t.id===e);o&&!o.read&&(o.read=!0,localStorage.setItem("userNotifications",JSON.stringify(ae)),Oe(),ze())}window.toggleNotifications=Zt;window.markNotificationAsRead=eo;function qe(){const e=document.querySelector('.payment-method-card[onclick*="yoco"]');e&&($e?(e.style.display="flex",console.log("Yoco payment option enabled")):(e.style.display="none",console.log("Yoco payment option hidden - not configured")))}document.addEventListener("DOMContentLoaded",function(){qe(),et(),Be(),qt(),Me(),Ut(),$t();const e=document.getElementById("fullNav");e&&e.style.display!=="none"&&Fe()});
