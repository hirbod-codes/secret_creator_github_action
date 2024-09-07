import * as core from '@actions/core'
import { Client, ClientChannel } from 'ssh2'

function execution(client: Client, command: string): Promise<void> {
    return new Promise((res, rej) => {
        client.exec(command, (err: Error | undefined, stream: ClientChannel) => {
            if (err)
                throw err

            stream.on('close', (code: any, signal: any) => {
                console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
                res()
            })

            stream.on('data', (data: any) => {
                console.log('STDOUT: ' + data);
            })

            stream.stderr.on('data', (data) => {
                console.log('STDERR: ' + data);
            })
        })
    })
}

async function run() {
    const promise = () => new Promise<void>((res, rej) => {
        try {
            const removePreviousSwarmSecrets: string = core.getInput('remove-previous-swarm-secrets', { required: true, trimWhitespace: true })
            const swarmSecretsPrefix: string = core.getInput('swarm-secrets-prefix', { required: true, trimWhitespace: true })

            const SSH_SERVER_ADDRESS: string = core.getInput('ssh-server-address', { required: true, trimWhitespace: true })
            const SSH_SERVER_PORT: string = core.getInput('ssh-server-port', { required: true, trimWhitespace: true })
            const SSH_SERVER_USERNAME: string = core.getInput('ssh-server-username', { required: true, trimWhitespace: true })
            const SSH_SERVER_PASSWORD: string = core.getInput('ssh-server-password', { required: true, trimWhitespace: true })

            const secretsJson: string = core.getInput('secrets-json', { required: true, trimWhitespace: true })

            const secrets = JSON.parse(secretsJson)

            const client = new Client()

            client.on('close', () => core.info('close'))

            client.on('end', () => core.info('end'))

            client.on('error', (err) => { throw err })

            client.on('ready', async () => {
                try {
                    core.info('Client :: ready')

                    if (Boolean(removePreviousSwarmSecrets) === true)
                        await execution(client, 'docker secret rm $(docker secret ls -q)')

                    const filteredSecretEntries = Object
                        .entries(secrets)
                        .filter(s => s[0].startsWith(swarmSecretsPrefix))

                    for (let i = 0; i < filteredSecretEntries.length; i++) {
                        const secretEntry = filteredSecretEntries[i];
                        await execution(client, `${secretEntry[1]} | docker secret create ${secretEntry[0]}  -`)
                    }

                    res()
                } catch (err) {
                    client.end()
                    res()
                    throw err
                } finally {
                    client.end()
                    res()
                }
            })

            client.connect({
                host: SSH_SERVER_ADDRESS,
                port: Number.parseInt(SSH_SERVER_PORT),
                username: SSH_SERVER_USERNAME,
                password: SSH_SERVER_PASSWORD,
            })
        } catch (error) {
            if (error instanceof Error)
                core.setFailed(error)
            else
                core.setFailed('failure')

            throw error
        }
    })

    await promise()
}

run()
    .then(() => console.log('finish.'))
