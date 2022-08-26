import * as core from '@actions/core'
import { getOctokit, context } from '@actions/github';
import { parse as parseYaml } from 'yaml';
import { Config } from './models/config';
import { Label } from './models/label';

type GitHubClient = ReturnType<typeof getOctokit>;

async function main() {
    try {
        const token = core.getInput('github-token', { required: true });
        const configPath = core.getInput('config-path', { required: true });

        const client: GitHubClient = getOctokit(token);
        const config = await loadConfig(client, configPath);

        let owner = core.getInput('owner');
        if (owner?.length === 0) {
            owner = context.repo.owner;
        }

        let repo = core.getInput('repo');
        if (repo?.length === 0) {
            repo = context.repo.repo;
        }

        const desiredLabels = config.labels;
        const currentLabels = await getLabels(client, owner, repo);

        await deleteLabels(client, owner, repo, currentLabels, desiredLabels);
        await createOrUpdateLabels(client, owner, repo, currentLabels, desiredLabels);
    } catch (err: any) {
        core.error(err.message);
        core.setFailed(err.message);
    }
}

async function getLabels(client: GitHubClient, owner: string, repo: string) { 
    let labels = new Array<Label>();

    let page = 0;
    while (true) {
        const response: { data: any } = await client.rest.issues.listLabelsForRepo({
            owner: owner,
            repo: repo,
            per_page: 100
        });

        for (let label of response.data) {
            labels.push({
                name: label.name,
                description: label.description,
                color: label.color
            })
        }

        if (response.data.length !== 100) {
            break;
        }

        page++;
    }

    core.info(`Existing Labels: ${JSON.stringify(labels)}`);
    return labels;
}

async function deleteLabels(client: GitHubClient, owner: string, repo: string, currentLabels: Label[], desiredLabels: Label[]) {
    for (const currentLabel of currentLabels) {
        if (desiredLabels.findIndex(l => l.name == currentLabel.name) === -1) {
            await deleteLabel(client, owner, repo, currentLabel);
        }
    }
}

async function createOrUpdateLabels(client: GitHubClient, owner: string, repo: string, currentLabels: Label[], desiredLabels: Label[]) {
    for (const desiredLabel of desiredLabels) {
        const index = currentLabels.findIndex(l => l.name == desiredLabel.name);
        if (index === -1) {
            await createLabel(client, owner, repo, desiredLabel);
        } else {
            const currentLabel = currentLabels[index];
            if (currentLabel.color !== desiredLabel.color || currentLabel.description != desiredLabel.description) {
                await updateLabel(client, owner, repo, desiredLabel);
            } else {
                core.debug(`Label: ${desiredLabel.name} is already up to date in ${owner}/${repo}\n${JSON.stringify(desiredLabel)}`);
            }
        }
    }
}

async function createLabel(client: GitHubClient, owner: string, repo: string, label: Label) {
    core.info(`Label: ${label.name} is being created in ${owner}/${repo}\n${JSON.stringify(label)}`)
    client.rest.issues.createLabel({
        owner: owner,
        repo: repo,
        name: label.name,
        description: label.description ?? '',
        color: label.color
    });
}

async function updateLabel(client: GitHubClient, owner: string, repo: string, label: Label) {
    core.info(`Label: ${label.name} is being updated in ${owner}/${repo}\n${JSON.stringify(label)}`)
    client.rest.issues.updateLabel({
        owner: owner,
        repo: repo,
        name: label.name,
        description: label.description ?? '',
        color: label.color
    });
}

async function deleteLabel(client: GitHubClient, owner: string, repo: string, label: Label) {
    core.info(`Label: ${label.name} is being removed from ${owner}/${repo}`);
    client.rest.issues.deleteLabel({
        owner: owner,
        repo: repo,
        name: label.name
    });
}

async function loadConfig(client: GitHubClient, configPath: string) {
    core.info(`Loading config from ${configPath}`)
    const configFileContents = await fetchContent(client, configPath);

    const config = parseYaml(configFileContents) as Config;
    core.debug(`Loaded Config:\n${JSON.stringify(config)}`)

    return config;
}

async function fetchContent(client: GitHubClient, path: string) {
    const response: { data: any } = await client.rest.repos.getContent({
        owner: context.repo.owner,
        repo: context.repo.repo,
        path: path,
        ref: context.sha
    });

    return Buffer.from(response.data.content, response.data.encoding).toString();
}

main();
