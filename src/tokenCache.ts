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
    validUntil: number,
    value: IOauthToken
}} = {};


export function getToken(key: string){ 
    cleanCache();
    const cacheToken = tokens[key];
    if (cacheToken) {
        return cacheToken.value;
    }
}

export async function setToken(key: string, tokenProm: Promise<IOauthToken>){
    cleanCache();
    if(tokenProm) {
        const token = await tokenProm;
        const validUntil = (new Date()).getTime() + ((token.expires_in || 30 * 60) * 1000);
        tokens[key] = {
            requested: new Date(),
            validUntil,
            value: token
        };
        return token;
    }
}


async function cleanCache() {
    // 1 hour ago
    // const tokenlifetimeago = new Date().getTime() - (60 * 60 * 1000);
    const fiveMinutesAgo = new Date().getTime() - (5 * 60 * 1000);

    Object.entries(tokens).forEach(
        function([key, value]) {
            // if( value.requested.getTime() < tokenlifetimeago ) {
            if( value.validUntil < fiveMinutesAgo ) {
                delete tokens[key];
            }
        }
    )
}