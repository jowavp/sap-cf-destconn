
import axios, { AxiosPromise } from 'axios';
import * as xsenv from '@sap/xsenv';
import * as tokenCache from './tokenCache';
import * as destinationCache from './destinationCache';

export async function readDestination<T extends IDestinationConfiguration>(destinationName: string, authorizationHeader?: string, subscribedSubdomain?: string) {

    const access_token = await createToken(getService(), subscribedSubdomain);
    // if we have a JWT token, we send it to the destination service to generate the new authorization header
    const jwtToken = /bearer /i.test(authorizationHeader || "") ? (authorizationHeader || "").replace(/bearer /i, "") : null;
    return getDestination<T>(access_token, destinationName, getService(), jwtToken);

}

export async function readSubaccountDestination<T extends IDestinationConfiguration>(destinationName: string, authorizationHeader?: string, subscribedSubdomain?: string) {

    const access_token = await createToken(getService(), subscribedSubdomain);

    // if we have a JWT token, we send it to the destination service to generate the new authorization header
    const jwtToken = /bearer /i.test(authorizationHeader || "") ? (authorizationHeader || "").replace(/bearer /i, "") : null;
    return getSubaccountDestination<T>(access_token, destinationName, getService(), jwtToken);

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
    uaadomain: string;
}

async function getDestination<T extends IDestinationConfiguration>(access_token: string, destinationName: string, ds: IDestinationService, jwtToken: string | null): Promise<IDestinationData<T>> {
    const cacheKey = `${destinationName}__${access_token}__${jwtToken}`;
    const cacheDest = destinationCache.get(cacheKey);

    if(cacheDest) {
        return cacheDest;
    }

    try{

        const destinationPromise = fetchDestination<T>(access_token, destinationName, ds, jwtToken);
        destinationCache.set(cacheKey, destinationPromise );
        return destinationPromise;
        
        /*
        destinationCache.set(cacheKey, response)
        return (await response).data;
        */
    } catch(e) {
        logAxiosError(e);
        throw `Unable to read the destination ${destinationName}`;
    }
}

async function getSubaccountDestination<T extends IDestinationConfiguration>(access_token: string, destinationName: string, ds: IDestinationService, jwtToken: string | null): Promise<T> {
    try{
        const response = await axios({
            url: `${ds.uri}/destination-configuration/v1/subaccountDestinations/${destinationName}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'X-user-token': jwtToken
            },
            responseType: 'json',
        });
        return response.data;
    } catch(e) {
        logAxiosError(e);
        throw `Unable to read the subaccount destination ${destinationName}`;
    }
}

async function createToken(ds: IDestinationService, subscribedSubdomain: string = ""): Promise<string> {
    try{
        const cacheKey = `${ds.clientid}__${subscribedSubdomain}`;
        const cacheToken = tokenCache.getToken(cacheKey);

        if(!cacheToken) {
            const tokenPromise = fetchToken(subscribedSubdomain, ds);
            tokenCache.setToken(cacheKey, tokenPromise);
            return (await tokenPromise).access_token
        }
        return (await cacheToken).access_token;
    } catch (e) {
        logAxiosError(e);
        throw 'unable to fetch oauth token for destination service';
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

async function fetchDestination<T extends IDestinationConfiguration> (access_token: string, destinationName: string, ds: IDestinationService, jwtToken: string | null) {
    const destination: IDestinationData<T> = (await axios({
        url: `${ds.uri}/destination-configuration/v1/destinations/${destinationName}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${access_token}`,
            'X-user-token': jwtToken
        },
        responseType: 'json',
    }) ).data;

    // console.log(destination);
    return destination;
}

async function fetchToken (subscribedSubdomain: string, ds: IDestinationService) {
    const tokenBaseUrl = subscribedSubdomain ? `https://${subscribedSubdomain}.${ds.uaadomain}` : ds.url;
    const token: tokenCache.IOauthToken = (await axios({
        url: `${tokenBaseUrl}/oauth/token`,
        method: 'POST',
        responseType: 'json',
        data: `client_id=${encodeURIComponent(ds.clientid)}&grant_type=client_credentials`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        auth: {
            username: ds.clientid,
            password: ds.clientsecret
        }
    })).data;

    return token;
}

export function logAxiosError (error: any) {
    console.log(`---------- begin sap-cf-destconn ---------`);
    if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error(error.response.data);
        console.error(error.response.status);
        console.error(error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.error( JSON.parse(error.request) );
      } else if (error.message) {
        // Something happened in setting up the request that triggered an Error
        console.error('Error', error.message);
      } else {
          try {
            console.error( JSON.parse(error) );
          } catch (err) {
            console.error(error);  
          }
      }
      if (error.config) {
        console.error(error.config);
      }
      console.log(`---------- end sap-cf-destconn ---------`);
}