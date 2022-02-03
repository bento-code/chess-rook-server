//true => production mode, false => localhost mode
const production=true;

let rest_api_url;
let user_url;
let sign_in_url;

if(!production) 
{
    rest_api_url = 'http://localhost:3000';
    user_url= rest_api_url + '/user'
    sign_in_url = rest_api_url + '/signin' 
}
else
{
    rest_api_url='https://chess-rook-rest-api.herokuapp.com';
    user_url=rest_api_url + '/user';
    sign_in_url = rest_api_url + '/signin' ;
}

const REST_API_URL=rest_api_url;
const USER_URL=user_url;
const SIGN_IN_URL=sign_in_url;

module.exports.REST_API_URL = REST_API_URL;
module.exports.SIGN_IN_URL= SIGN_IN_URL;
module.exports.USER_URL= USER_URL;