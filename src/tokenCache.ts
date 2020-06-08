export type IOauthToken = {
    "access_token": string,
    "token_type": string,
    "expires_in": number,
    "scope": string,
    "jti": string
}

const tokens: {[clientid: string]: {
    validUntil: Date,
    value: IOauthToken
}} = {};


export function getToken(key: string){ 
    cleanCache();
    const cacheToken = tokens[key];
    if (cacheToken) {
        return cacheToken.value;
    }
}

export function setToken(key: string, token: IOauthToken){
    cleanCache();
    if(token) {
        tokens[key] = {
            validUntil: new Date( new Date().getTime() + (token.expires_in * 1000) ),
            value: token
        };
        return token;
    }
}


function cleanCache() {
    const now = new Date().getTime() - 1000;
    Object.entries(tokens).forEach(
        function([key, value]) {
            if( value.validUntil.getTime() < now ) {
                delete tokens[key];
            }
        }
    )
}