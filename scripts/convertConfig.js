const dot = require('dot-object');

const config = { };

const flatConfig = dot.dot(config);

for (let k of Object.keys(flatConfig)) {
    switch (typeof flatConfig[k]) {
        case 'object':
        case 'string':
            break;
        default:
            flatConfig[k] += `$typeof:${typeof flatConfig[k]}`;
    }
}

console.log(flatConfig);
