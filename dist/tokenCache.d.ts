export type IOauthToken = {
    "access_token": string;
    "token_type": string;
    "expires_in": number;
    "scope": string;
    "jti": string;
};
export declare function getToken(key: string): IOauthToken | undefined;
export declare function setToken(key: string, tokenProm: Promise<IOauthToken>): Promise<IOauthToken | undefined>;
