import axios, { AxiosPromise } from 'axios';

export type IOauthToken = {
    "access_token": string,
    "token_type": string,
    "expires_in": number,
    "scope": string,
    "jti": string
}

const tokens: {[clientid: string]: {
    requested: Date,
    value: Promise<IOauthToken>
}} = {};


export function getToken(key: string){ 
    cleanCache();
    const cacheToken = tokens[key];
    if (cacheToken) {
        return cacheToken.value;
    }
}

export function setToken(key: string, token: Promise<IOauthToken>){
    cleanCache();
    if(token) {
        tokens[key] = {
            requested: new Date(),
            value: token
        };
        return token;
    }
}


function cleanCache() {
    // 1 hour ago
    const tokenlifetimeago = new Date().getTime() - (60 * 60 * 1000);

    Object.entries(tokens).forEach(
        function([key, value]) {
            if( value.requested.getTime() < tokenlifetimeago ) {
                delete tokens[key];
            }
        }
    )
}