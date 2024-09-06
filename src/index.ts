import * as core from '@actions/core'
import { Client } from 'ssh2'

async function run(): Promise<void> {
    try {
        const removePreviousSwarmSecrets: string = core.getInput('removePreviousSwarmSecrets', { required: true, trimWhitespace: true })
        const swarmSecretsPrefix: string = core.getInput('swarmSecretsPrefix', { required: true, trimWhitespace: true })

        const SSH_SERVER_ADDRESS: string = core.getInput('sshServerAddress', { required: true, trimWhitespace: true })
        const SSH_SERVER_PORT: string = core.getInput('sshServerPort', { required: true, trimWhitespace: true })
        const SSH_SERVER_USERNAME: string = core.getInput('sshServerUsername', { required: true, trimWhitespace: true })

        const secretsJson: string = core.getInput('secretsJson', { required: true, trimWhitespace: true })

        const secrets = JSON.parse(secretsJson)

        const client = new Client()

        client.on('close', () => core.info('Client :: close'))

        client.on('error', (err) => core.error(err.message))

        client.on('ready', () => {
            core.info('Client :: ready')

            if (Boolean(removePreviousSwarmSecrets) === true)
                client.shell((err, stream) => {
                    if (err)
                        throw err

                    stream.on('close', () => core.info('Stream :: close'))

                    stream.on('data', (data: any) => core.info('Stream :: Out: ' + data.toString()))

                    stream.end('docker secret rm $(docker secret ls -q)')
                })

            Object
                .entries(secrets)
                .filter(s => s[0].startsWith(swarmSecretsPrefix))
                .forEach(s => {
                    client.shell((err, stream) => {
                        if (err)
                            throw err

                        stream.on('close', () => core.info('Stream :: close'))

                        stream.on('data', (data: any) => core.info('Stream :: Out: ' + data.toString()))

                        stream.end(`docker secret rm ${s[0]}`)
                    })

                    client.shell((err, stream) => {
                        if (err)
                            throw err

                        stream.on('close', () => core.info('Stream :: close'))

                        stream.on('data', (data: any) => core.info('Stream :: Out: ' + data.toString()))

                        stream.end(`${s[1]} | docker secret create ${s[0]}  -`)
                    })
                })

            client.end()
        })

        client.connect({
            host: SSH_SERVER_ADDRESS,
            port: Number.parseInt(SSH_SERVER_PORT),
            username: SSH_SERVER_USERNAME,
        })
    } catch (error) {
        if (error instanceof Error)
            core.setFailed(error.message)
    }
}

run()
