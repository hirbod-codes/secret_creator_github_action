import * as core from '@actions/core'
import { Client, ClientChannel } from 'ssh2'

function execution(client: Client, command: string): Promise<void> {
    core.info(`executing command: ${command}`)

    return new Promise((res, rej) => {
        client.exec(command, (err: Error | undefined, stream: ClientChannel) => {
            if (err)
                throw err

            stream.on('close', (code: any, signal: any) => {
                core.info('Stream :: close :: code: ' + code + ', signal: ' + signal);
                res()
            })

            stream.on('data', (data: any) => core.info('STDOUT: ' + data))

            stream.stderr.on('data', (data) => core.error('STDERR: ' + data))
        })
    })
}

async function run() {
    const promise = () => new Promise<void>((res, rej) => {
        try {
            core.info('collecting input variables...')

            const swarmSecretsPrefix: string = core.getInput('swarm-secrets-prefix', { required: true, trimWhitespace: true })

            const SSH_SERVER_ADDRESS: string = core.getInput('ssh-server-address', { required: true, trimWhitespace: true })
            const SSH_SERVER_PORT: string = core.getInput('ssh-server-port', { required: true, trimWhitespace: true })
            const SSH_SERVER_USERNAME: string = core.getInput('ssh-server-username', { required: true, trimWhitespace: true })
            const SSH_SERVER_PASSWORD: string = core.getInput('ssh-server-password', { required: true, trimWhitespace: true })

            const secretsJson: string = core.getInput('secrets-json', { required: true, trimWhitespace: true })

            let secrets: object | undefined = undefined
            try {
                secrets = JSON.parse(secretsJson)
            } catch (error) {
                core.warning('failed to parse provided secrets json.')
            }

            core.info('adding event listeners...')
            const client = new Client()

            client.on('close', () => core.info('close'))

            client.on('end', () => core.info('end'))

            client.on('error', (err) => { throw err })

            client.on('ready', async () => {
                try {
                    core.info('Client :: ready')

                    if (!secrets) {
                        res()
                        return
                    }

                    const filteredSecretEntries = Object
                        .entries(secrets)
                        .filter(s => s[0].startsWith(swarmSecretsPrefix))

                    core.info(JSON.stringify(filteredSecretEntries, undefined, 4))

                    for (let i = 0; i < filteredSecretEntries.length; i++) {
                        const secretEntry = filteredSecretEntries[i];
                        const secretName = secretEntry[0].replace(swarmSecretsPrefix, '').toLowerCase()
                        const secretValue = secretEntry[1]
                        await execution(client, `docker secret rm ${secretName}; echo ${secretValue} | docker secret create ${secretName}  -`)
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

            core.info('connecting...')
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
    .then(() => core.info('finish.'))
