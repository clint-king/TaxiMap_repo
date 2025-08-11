let baseUrl;

if(true){
  //local 
  baseUrl = "http://localhost:3000";
}else{
//render
 baseUrl = 'https://api.teksimap.co.za' ;
}

export const BASE_URL = baseUrl;