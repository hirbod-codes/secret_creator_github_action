"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const ssh2_1 = require("ssh2");
async function run() {
    try {
        const removePreviousSwarmSecrets = core.getInput('removePreviousSwarmSecrets', { required: true, trimWhitespace: true });
        const swarmSecretsPrefix = core.getInput('swarmSecretsPrefix', { required: true, trimWhitespace: true });
        const SSH_SERVER_ADDRESS = core.getInput('sshServerAddress', { required: true, trimWhitespace: true });
        const SSH_SERVER_PORT = core.getInput('sshServerPort', { required: true, trimWhitespace: true });
        const SSH_SERVER_USERNAME = core.getInput('sshServerUsername', { required: true, trimWhitespace: true });
        const secretsJson = core.getInput('secretsJson', { required: true, trimWhitespace: true });
        const secrets = JSON.parse(secretsJson);
        const client = new ssh2_1.Client();
        client.on('close', () => core.info('Client :: close'));
        client.on('error', (err) => core.error(err.message));
        client.on('ready', () => {
            core.info('Client :: ready');
            if (Boolean(removePreviousSwarmSecrets) === true)
                client.shell((err, stream) => {
                    if (err)
                        throw err;
                    stream.on('close', () => core.info('Stream :: close'));
                    stream.on('data', (data) => core.info('Stream :: Out: ' + data.toString()));
                    stream.end('docker secret rm $(docker secret ls -q)');
                });
            Object
                .entries(secrets)
                .filter(s => s[0].startsWith(swarmSecretsPrefix))
                .forEach(s => {
                client.shell((err, stream) => {
                    if (err)
                        throw err;
                    stream.on('close', () => core.info('Stream :: close'));
                    stream.on('data', (data) => core.info('Stream :: Out: ' + data.toString()));
                    stream.end(`docker secret rm ${s[0]}`);
                });
                client.shell((err, stream) => {
                    if (err)
                        throw err;
                    stream.on('close', () => core.info('Stream :: close'));
                    stream.on('data', (data) => core.info('Stream :: Out: ' + data.toString()));
                    stream.end(`${s[1]} | docker secret create ${s[0]}  -`);
                });
            });
            client.end();
        });
        client.connect({
            host: SSH_SERVER_ADDRESS,
            port: Number.parseInt(SSH_SERVER_PORT),
            username: SSH_SERVER_USERNAME,
        });
    }
    catch (error) {
        if (error instanceof Error)
            core.setFailed(error.message);
    }
}
run();
//# sourceMappingURL=index.js.map