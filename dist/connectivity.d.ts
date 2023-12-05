import { AxiosProxyConfig } from 'axios';
export interface IConnectivityConfig {
    proxy: AxiosProxyConfig;
    headers: {
        'Proxy-Authorization'?: string;
        'SAP-Connectivity-Technical-Authentication'?: string;
        'SAP-Connectivity-SCC-Location_ID'?: string;
    };
    onpremise_proxy_host?: string;
    onpremise_proxy_port?: number;
    onpremise_proxy_http_port?: number;
    access_token?: string;
    onpremise_proxy_ldap_port?: number;
    onpremise_socks5_proxy_port?: number;
    onpremise_proxy_rfc_port?: number;
}
export declare function readConnectivity(locationId?: string, principalToken?: string, principalPropagation?: boolean, subscribedDomain?: string): Promise<IConnectivityConfig>;
