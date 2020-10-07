import { IDestinationConfiguration, IDestinationData } from "./destination";
export declare function get(key: string): Promise<IDestinationData<any>> | undefined;
export declare function set<T extends IDestinationConfiguration>(key: string, destination: Promise<IDestinationData<T>>): Promise<IDestinationData<T>> | undefined;
