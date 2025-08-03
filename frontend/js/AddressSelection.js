let baseUrl;

if(true){
  //local 
  baseUrl = "http://localhost:3000";
}else{
//render
 baseUrl = 'https://taximap-repo.onrender.com' ;
}

export const BASE_URL = baseUrl;