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
    const cacheToken = tokens[key];
    if(cacheToken && new Date().getTime() < (cacheToken.validUntil.getTime() - 1000) ) {
        return cacheToken.value;
    }
}

export function setToken(key: string, token: IOauthToken){
    tokens[key] = {
        validUntil: new Date( new Date().getTime() + (token.expires_in * 1000) ),
        value: token
    };
}