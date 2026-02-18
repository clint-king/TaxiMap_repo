import"./AddressSelection-CWIIN_Gi.js";/* empty css                *//* empty css                    *//* empty css               */import"./tonav-BKPMnGmg.js";import"./logout-DBLdyFVo.js";import"./axios-D4YhIzwJ.js";const l=[{id:1,name:"Golden Arrow Minibus",type:"minibus",registration:"CA 123-456",capacity:16,rate:15.5,rating:4.8,reviews:127,images:[{url:"../../assets/images/Gemini_Generated_Image_7zi2po7zi2po7zi2.png",description:"Front view of the minibus"},{url:"../../assets/images/toyota-quantum.jpg",description:"Side view showing seating"},{url:"../../assets/images/Coach Rentals 27.jpeg",description:"Interior with comfortable seats"},{url:"../../assets/images/tol00005_u27946_3.jpg",description:"Back view with luggage space"}],amenities:["AC","Music","WiFi","Charging Ports"],owner:{name:"John Mthembu",experience:"5 years experience",rating:4.9,phone:"+27 82 123 4567",avatar:"JM"},description:"Well-maintained minibus with comfortable seating and modern amenities. Perfect for group trips.",features:{seating:"16 comfortable seats",luggage:"Large luggage compartment",safety:"First aid kit, fire extinguisher",comfort:"Air conditioning, music system"}},{id:2,name:"City Express Bus",type:"bus",registration:"GP 789-012",capacity:22,rate:12,rating:4.6,reviews:89,images:[{url:"../../assets/images/White Van with Black and Yellow Stripes.png",description:"Front view of the 22-seater bus"},{url:"../../assets/images/Coach Rentals 27.jpeg",description:"Side view showing all windows"},{url:"../../assets/images/toyota-quantum.jpg",description:"Interior with spacious seating"}],amenities:["AC","Music","WiFi","Luggage Space"],owner:{name:"Sarah Dlamini",experience:"8 years experience",rating:4.7,phone:"+27 83 456 7890",avatar:"SD"},description:"Spacious 22-seater bus ideal for large groups. Features modern amenities and comfortable seating.",features:{seating:"22 spacious seats",luggage:"Extra luggage space",safety:"Safety belts, emergency exits",comfort:"Air conditioning, music system"}},{id:3,name:"Metro Transport",type:"minibus",registration:"KZN 345-678",capacity:18,rate:18,rating:4.9,reviews:156,images:[{url:"../../assets/images/toyota-quantum.jpg",description:"Front view of the minibus"},{url:"../../assets/images/Coach Rentals 27.jpeg",description:"Side view showing design"},{url:"../../assets/images/tol00005_u27946_3.jpg",description:"Interior with premium seats"}],amenities:["AC","Music","WiFi","Charging Ports","Luggage Space"],owner:{name:"Mike Johnson",experience:"10 years experience",rating:4.9,phone:"+27 84 789 0123",avatar:"MJ"},description:"Premium minibus with luxury amenities. Perfect for business trips and special occasions.",features:{seating:"18 premium seats",luggage:"Spacious luggage area",safety:"Advanced safety features",comfort:"Luxury amenities, WiFi"}}];document.addEventListener("DOMContentLoaded",function(){const e=document.getElementById("authButtons"),a=document.getElementById("fullNav");localStorage.getItem("userProfile")||sessionStorage.getItem("userProfile")?(e.style.display="none",a.style.display="block"):(e.style.display="block",a.style.display="none"),c(),u()});function c(){const e=document.getElementById("vehiclesGrid");e.innerHTML="",l.forEach(a=>{const i=r(a);e.appendChild(i)})}function r(e){const a=document.createElement("div");return a.className="vehicle-card",a.setAttribute("data-vehicle-id",e.id),a.onclick=()=>o(e.id),a.innerHTML=`
                <div class="vehicle-image-container">
                    <img src="${e.images[0].url}" alt="${e.name}" class="vehicle-main-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDQwMCAyNTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIyNTAiIGZpbGw9IiMwMTM4NkEiLz48dGV4dCB4PSIyMDAiIHk9IjEyNSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSIjRkZENTJGIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5WZWhpY2xlIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                    <div class="image-overlay">
                        <div class="image-info">
                            <div class="image-count">
                                <i class="fas fa-images"></i> ${e.images.length} photos
                            </div>
                        </div>
                    </div>
                </div>
                <div class="vehicle-info">
                    <div class="vehicle-header">
                        <div>
                            <h3 class="vehicle-name">${e.name}</h3>
                            <p class="vehicle-type">${e.type==="minibus"?"Minibus Taxi":"22-Seater Bus"}</p>
                        </div>
                        <div class="vehicle-rating">
                            <span class="stars">${"★".repeat(Math.floor(e.rating))}${"☆".repeat(5-Math.floor(e.rating))}</span>
                            <span class="rating-text">${e.rating}/5 (${e.reviews})</span>
                        </div>
                    </div>
                    <div class="vehicle-details">
                        <div class="detail-item">
                            <span class="detail-label">Capacity</span>
                            <span class="detail-value">${e.capacity} seats</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Rate</span>
                            <span class="detail-value">R ${e.rate}/km</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Registration</span>
                            <span class="detail-value">${e.registration}</span>
                            </div>
                        <div class="detail-item">
                            <span class="detail-label">Owner</span>
                            <span class="detail-value">${e.owner.name}</span>
                        </div>
                    </div>
                    <div class="vehicle-amenities">
                        ${e.amenities.map(i=>`<span class="amenity-tag">${i}</span>`).join("")}
                    </div>
                    <div class="owner-info">
                        <div class="owner-name">${e.owner.name}</div>
                        <div class="owner-experience">${e.owner.experience}</div>
                    </div>
                    <div class="vehicle-actions">
                        <button class="btn-view-details" onclick="event.stopPropagation(); showVehicleDetails(${e.id})">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                        <button class="btn-select" onclick="event.stopPropagation(); selectVehicle(${e.id})">
                            <i class="fas fa-check"></i> Select
                        </button>
                    </div>
                </div>
            `,a}function o(e){const a=l.find(i=>i.id===e);a&&(document.getElementById("modalTitle").textContent=a.name,document.getElementById("modalBody").innerHTML=m(a),document.getElementById("vehicleModal").style.display="block")}function m(e){return`
                <div class="vehicle-gallery">
                    <div class="main-image">
                        <img src="${e.images[0].url}" alt="${e.name}" id="mainImage" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiMwMTM4NkEiLz48dGV4dCB4PSIyMDAiIHk9IjE1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE4IiBmaWxsPSIjRkZENTJGIiB0ZXh0LWFuY2hlcj0ibWlkZGxlIj5WZWhpY2xlIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                    </div>
                    <div class="thumbnail-grid">
                        ${e.images.slice(0,4).map((a,i)=>`
                            <div class="thumbnail" onclick="changeMainImage('${a.url}')">
                                <img src="${a.url}" alt="${a.description}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE0MCIgdmlld0JveD0iMCAwIDIwMCAxNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNDAiIGZpbGw9IiMwMTM4NkEiLz48dGV4dCB4PSIxMDAiIHk9IjcwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNGRkQ1MkYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                            </div>
                        `).join("")}
                    </div>
                </div>

                <div class="vehicle-details-full">
                    <div class="details-section">
                        <h3 class="section-title">Vehicle Information</h3>
                        <div class="detail-row">
                            <span class="detail-label-full">Type:</span>
                            <span class="detail-value-full">${e.type==="minibus"?"Minibus Taxi":"22-Seater Bus"}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label-full">Registration:</span>
                            <span class="detail-value-full">${e.registration}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label-full">Capacity:</span>
                            <span class="detail-value-full">${e.capacity} seats</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label-full">Rate per km:</span>
                            <span class="detail-value-full">R ${e.rate}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label-full">Rating:</span>
                            <span class="detail-value-full">${e.rating}/5 (${e.reviews} reviews)</span>
                </div>
            </div>

                    <div class="details-section">
                        <h3 class="section-title">Features & Amenities</h3>
                        <div class="detail-row">
                            <span class="detail-label-full">Seating:</span>
                            <span class="detail-value-full">${e.features.seating}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label-full">Luggage:</span>
                            <span class="detail-value-full">${e.features.luggage}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label-full">Safety:</span>
                            <span class="detail-value-full">${e.features.safety}</span>
                    </div>
                        <div class="detail-row">
                            <span class="detail-label-full">Comfort:</span>
                            <span class="detail-value-full">${e.features.comfort}</span>
                        </div>
                    </div>
                </div>
                
                <div class="owner-section">
                    <h3 class="section-title">Owner Information</h3>
                    <div class="owner-header">
                        <div class="owner-avatar">${e.owner.avatar}</div>
                        <div class="owner-details">
                            <h3>${e.owner.name}</h3>
                            <div class="owner-rating">
                                <span class="stars">${"★".repeat(Math.floor(e.owner.rating))}${"☆".repeat(5-Math.floor(e.owner.rating))}</span>
                                <span class="rating-text">${e.owner.rating}/5</span>
                </div>
                            <p>${e.owner.experience}</p>
                            <p><i class="fas fa-phone"></i> ${e.owner.phone}</p>
        </div>
        </div>
    </div>

                <div class="modal-actions">
                    <button class="btn-modal btn-secondary-modal" onclick="closeModal()">
                        <i class="fas fa-times"></i> Close
                    </button>
                    <button class="btn-modal btn-primary-modal" onclick="selectVehicle(${e.id}); closeModal();">
                        <i class="fas fa-check"></i> Select This Vehicle
                    </button>
            </div>
            `}function p(e){document.getElementById("mainImage").src=e}function g(e){const a=l.find(s=>s.id===e);if(!a)return;document.querySelectorAll(".vehicle-card").forEach(s=>{s.classList.remove("selected")});const i=document.querySelector(`[data-vehicle-id="${e}"]`);i&&i.classList.add("selected"),sessionStorage.setItem("selectedVehicle",JSON.stringify(a)),window.location.href="booking-passenger-info.html"}window.selectVehicle=g;function d(){document.getElementById("vehicleModal").style.display="none"}window.showVehicleDetails=o;window.closeModal=d;window.changeMainImage=p;function u(){["vehicleTypeFilter","priceFilter","ratingFilter","amenitiesFilter"].forEach(a=>{document.getElementById(a).addEventListener("change",v)})}function v(){const e=document.getElementById("vehicleTypeFilter").value,a=document.getElementById("priceFilter").value,i=document.getElementById("ratingFilter").value;let s=l.filter(t=>{let n=!0;return e&&t.type!==e&&(n=!1),i&&t.rating<parseFloat(i)&&(n=!1),a&&(a==="low"&&t.rate>=15&&(n=!1),a==="medium"&&(t.rate<15||t.rate>20)&&(n=!1),a==="high"&&t.rate<=20&&(n=!1)),n});f(s)}function f(e){const a=document.getElementById("vehiclesGrid");if(a.innerHTML="",e.length===0){a.innerHTML='<p style="text-align: center; color: #6c757d; font-size: 1.2rem; grid-column: 1/-1;">No vehicles found matching your criteria.</p>';return}e.forEach(i=>{const s=r(i);a.appendChild(s)})}window.onclick=function(e){const a=document.getElementById("vehicleModal");e.target===a&&d()};
