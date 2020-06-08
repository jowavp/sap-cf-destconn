
import axios, { AxiosPromise } from 'axios';
import * as xsenv from '@sap/xsenv';
import * as tokenCache from './tokenCache';


const tokens: {[clientid: string]: {
    validUntil: Date,
    value: any
}} = {};

export async function readDestination<T extends IDestinationConfiguration>(destinationName: string, authorizationHeader?: string) {

    const access_token = await createToken(getService());

    // if we have a JWT token, we send it to the destination service to generate the new authorization header
    const jwtToken = /bearer /i.test(authorizationHeader || "") ? (authorizationHeader || "").replace(/bearer /i, "") : null;
    return getDestination<T>(access_token, destinationName, getService(), jwtToken);

}

export interface IDestinationData<T extends IDestinationConfiguration> {
    owner: {
        SubaccountId: string;
        InstanceId: string;
    },
    destinationConfiguration: T,
    authTokens:
    {
        type: string;
        value: string;
        expires_in: string;
        error: string;
    }[]
}

export interface IDestinationConfiguration {
    Name: string;
    Type: string;
}

export interface IHTTPDestinationConfiguration extends IDestinationConfiguration  {
    URL: string;
    Authentication: "NoAuthentication" | "BasicAuthentication" | "OAuth2UserTokenExchange" | "OAuth2SAMLBearerAssertion" | "PrincipalPropagation" | "OAuth2ClientCredentials";
    ProxyType: string;
    CloudConnectorLocationId: string;
    Description: string;

    User: string;
    Password: string;

    tokenServiceURLType: string;
    clientId: string;
    saml2_audience: string;
    tokenServiceURL: string;
    clientSecret: string;
    scope?: string;
    Scope?: string;
    oauth_audience?: string;

    WebIDEUsage: string;
    WebIDEEnabled: string;

}

export interface IMailDestinationConfiguration extends IDestinationConfiguration {
    "mail.password": string;
    "mail.user": string;
    "mail.smtp"?: string;
    "mail.port"?: string;
    "mail.from"?: string;
}

export interface IDestinationService {
    // url for authentication
    url: string;
    // url for destination configuration
    uri: string;
    clientid: string;
    clientsecret: string;
}

async function getDestination<T extends IDestinationConfiguration>(access_token: string, destinationName: string, ds: IDestinationService, jwtToken: string | null): Promise<IDestinationData<T>> {
    try{
        const response = await axios({
            url: `${ds.uri}/destination-configuration/v1/destinations/${destinationName}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'X-user-token': jwtToken
            },
            responseType: 'json',
        });
        return response.data;
    } catch(e) {
        console.error(`Unable to read the destination ${destinationName}`, e)
        throw e;
    }
}

async function createToken(ds: IDestinationService): Promise<string> {
    try{
        const cacheToken = tokenCache.getToken(ds.clientid)

        if(!cacheToken) {
            const response =  await axios({
                url: `${ds.url}/oauth/token`,
                method: 'POST',
                responseType: 'json',
                data: `client_id=${encodeURIComponent(ds.clientid)}&grant_type=client_credentials`,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                auth: {
                    username: ds.clientid,
                    password: ds.clientsecret
                }
            });
            tokenCache.setToken(ds.clientid, response.data);
            
            return response.data.access_token;
        }
        return cacheToken.access_token;
    } catch (e) {
        console.error('unable to fetch oauth token for destination service', e);
        throw e;
    }
};

function getService(): IDestinationService {
    const { destination } = xsenv.getServices({
        destination: {
            tag: 'destination'
        }
    });

    if (!destination) {
        throw ('No destination service available');
    }

    return destination;
}