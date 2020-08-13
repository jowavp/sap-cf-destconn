import axios, { AxiosProxyConfig } from 'axios';
import * as xsenv from '@sap/xsenv';
import * as tokenCache from './tokenCache';

var tokens = {};

export interface IConnectivityConfig {
    proxy: AxiosProxyConfig,
    headers: {
        'Proxy-Authorization': string;
        'SAP-Connectivity-SCC-Location_ID'?: string;
    }
}

interface IConnectivityService {
    // url for authentication
    url: string;
    // url for destination configuration
    uri: string;
    clientid: string;
    clientsecret: string;

    onpremise_proxy_host: string;
    onpremise_proxy_port: string;
    onpremise_proxy_ldap_port: string;
    onpremise_proxy_rfc_port: string;
    onpremise_socks5_proxy_port: string;
}

export async function readConnectivity(locationId?: string, principalToken?: string) {
    const connectivityService = getService();
    const access_token = await createToken(connectivityService, principalToken);
    const proxy: AxiosProxyConfig = {
        host: connectivityService.onpremise_proxy_host,
        port: parseInt(connectivityService.onpremise_proxy_port, 10),
        protocol: 'http'
    };

    const result: IConnectivityConfig = {
        proxy,
        headers: {
            'Proxy-Authorization': `Bearer ${access_token}`
        }
    }

    if (locationId) {
        result.headers["SAP-Connectivity-SCC-Location_ID"] = locationId;
    }

    return result;

}

async function createToken(service: IConnectivityService, principalToken?: string): Promise<string> {
    
    const cacheKey = `${service.clientid}__${principalToken}`;
    const cachedToken = tokenCache.getToken(cacheKey);

    if(cachedToken) {
        return cachedToken.access_token;
    }
    

    if (principalToken) {
        
        const refreshToken = (await axios({
            url: `${service.url}/oauth/token`,
            method: 'POST',
            responseType: 'json',
            params: {
                grant_type: 'user_token',
                response_type: 'token',
                client_id: service.clientid
            },
            headers: {
                'Accept': 'application/json',
                'Authorization': principalToken
            },

        })).data.refresh_token;
        const token = (await axios({
            url: `${service.url}/oauth/token`,
            method: 'POST',
            responseType: 'json',
            params: {
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            },
            headers: {
                'Accept': 'application/json'
            },
            auth: {
                username: service.clientid,
                password: service.clientsecret
            }
        })).data;
        tokenCache.setToken(cacheKey, token)
        return token.access_token;
    }
    const token2 = (await axios({
        url: `${service.url}/oauth/token`,
        method: 'POST',
        responseType: 'json',
        data: `client_id=${encodeURIComponent(service.clientid)}&grant_type=client_credentials`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        auth: {
            username: service.clientid,
            password: service.clientsecret
        }
    })).data;
    tokenCache.setToken(cacheKey, token2)
    return token2.access_token;
};

function getService(): IConnectivityService {
    const { connectivity } = xsenv.getServices({
        connectivity: {
            tag: 'connectivity'
        }
    });

    if (!connectivity) {
        throw ('No connectivity service available');
    }

    return connectivity;
}

