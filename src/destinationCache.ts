const destinations: {[clientid: string]: {
    validUntil: Date,
    value: any
}} = {};
const cacheLifetime = 60000;


export function get(key: string){
    cleanCache(); 
    const cacheToken = destinations[key];
    if (cacheToken) {
        return cacheToken.value;
    }
}

export function set(key: string, destination: any){
    cleanCache();
    if(destination) {
        destinations[key] = {
            validUntil: new Date( new Date().getTime() + cacheLifetime ),
            value: destination
        };
        return destination[key].value;
    }
}

function cleanCache() {
    const now = new Date().getTime() - 1000;
    Object.entries(destinations).forEach(
        function([key, value]) {
            if( value.validUntil.getTime() < now ) {
                delete destinations[key];
            }
        }
    )
}