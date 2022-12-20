---
id: creating-a-plugin
title: Creating Plugins
---

# Creating plugins for ToolJet 

## What are plugins

ToolJet is built with extensibility in mind. Plugins allows developers to extend the functionalities of ToolJet using JavaScript. Plugins can only be connectors at this moment. For example, the data source connectors such as PostgreSQL, MySQL, Twilio, Stripe, etc are built as plugins. 

In this guide, we will walk you through building plugins for ToolJet with the help of `tooljet` cli.

`tooljet` cli is a commandline tool built for building plugins easily. We will build a simple plugin for BigQuery in this guide. 

### What does a plugin look like?

All the plugins live under the `/plugins` directory. The structure of a plugin looks like this:

```
  my-awesome-plugin/
    package.json
    lib/
      icon.svg
      index.ts
      operations.json
      manifest.json
```

- manifest.json should include information such as the name of plugin, description, etc. 
- operations.json should include the metadata of all the operations supported by the plugin.
- index.ts is the main file. It defines a `QueryService` for the plugin. The `QueryService` handles running of queries, testing connections, caching connections, etc.
- icon.svg is the icon for the plugin.
- package.json is auto generated by the cli. 

## Getting Started

1. Install [tooljet-cli](https://www.npmjs.com/package/@tooljet/cli):
  ```bash
  $ npm i -g @tooljet/cli
  ```

2. Bootstrap a new plugin using cli
  ```bash
  $ tooljet plugin create bigquery
  ```

  ```bash
  creating plugin... done
  Plugin: bigquery created successfully
  └─ plugins
    └─ packages
        └─ bigquery
  ```

3. Add the npm package of BigQuery to the plugin dependencies
  ```bash
  $ tooljet plugin install @google-cloud/bigquery --plugin bigquery
  ```

4. Now the directory for our new plugin should looks something like below: 

  ```bash
  plugins/
    package.json
    packages/
      bigquery/
        __tests__
          bigquery.test.js
        package.json
        lib/
          icon.svg
          index.ts
          operations.json
          manifest.json
  ```

5. Add data source config paramets to manifest.json

  Our BigQuery plugin needs private key of a GCP service account to connect to BigQuery. Let's add `private_key` as a property for the data source. 

  ```json
  {
    "$schema": "https://json-schema.org/",
    "$id": "https://tooljet.io/BigQuery.schema.json",
    "title": "BigQuery datasource",
    "description": "A schema defining BigQuery datasource",
    "type": "api",
    "source": {
      "name": "BigQuery",
      "kind": "bigquery",
      "exposedVariables": {
        "isLoading": false,
        "data": {},
        "rawData": {}
      },
      "options": {
        "private_key": { "encrypted": true }
      }
    },
    "defaults": {
      "private_key": { "value": "" }
    },
    "properties": {
      "private_key": {
        "label": "Private key",
        "key": "private_key",
        "type": "textarea",
        "description": "Enter JSON private key for service account"
      }
    },
    "required": ["private_key"]
  }

  ```

6. Import npm package BigQuery to index.ts
  ```javascript
  const { BigQuery } = require('@google-cloud/bigquery');
  ```

6. Edit index.ts to include the logic for creating a connection.    
  ```javascript
  async getConnection(sourceOptions: any, _options?: object): Promise<any> {
    const privateKey = JSON.parse(sourceOptions['private_key']);
    const client = new BigQuery({
      projectId: privateKey['project_id'],
      credentials: {
        client_email: privateKey['client_email'],
        private_key: privateKey['private_key'],
      },
    });

    return client;
  }
  ```

7. Edit index.ts to include the logic for testing connection.    
  When a new data source is being added to a ToolJet application, the connection can be tested. 

  :::info
  NOTE: Every data source might not have a way to test connection. If not applicable for your data source, you can disable the test connection feature by adding `"customTesting": true,` to the `manifest.json` of your plugin.
  :::

8. Add manifest entry for operations   

    In this example, let's add two operations for our BigQuery plugin.   
    - *List databases* - Lists all the databases.
    - *Query database*   - Query a specific database.

    We need to make the entries to `operations.json`. The `operations.json` should look like this now:
    ```json
    {
      "$schema": "https://json-schema.org/",
      "$id": "https://tooljet.io/dataqueries/Bigquery.schema.json",
      "title": "Dynamodb datasource",
      "description": "Operations for BigQuery plugin",
      "type": "object",
      "defaults": {},
      "properties": {
          "operation": {
              "label": "Operation",
              "key": "operation",
              "type": "dropdown-component-flip",
              "description": "Single select dropdown for operation",
              "list": [
                  {
                      "value": "list_datasets",
                      "name": "List Datasets"
                  },
                  {
                      "value": "query",
                      "name": "Query"
                  }
              ]
          },
          "query": {
              "query": {
                  "label": "Query",
                  "key": "query",
                  "type": "codehinter",
                  "description": "",
                  "height": "150px"
              }
          }
      }
    }

    ```

8. Handle the logic for running queries in `index.ts`   

  `QueryService` receives the metadata of the data source including the credentials and configs for connecting and parameters for the query that was run. In our example, `sourceOptions` will have the `private_key` of BigQuery datasource associated with the query. `queryOptions` will have the configs and parameters for the specific query. For example, `queryOption.operation` will give the id of current operation. 
  
  ```javascript
    export default class BigQueryQueryService implements QueryService {
      async run(sourceOptions: any, queryOptions: any, _dataSourceId: string): Promise<QueryResult> {
        const operation = queryOptions.operation;
        const client = await this.getConnection(sourceOptions);
        let result = {};

        try {
          switch (operation) {
            case 'list_datasets':
                result = await client.getDatasets();
                break;
          }
        } catch (error) {
          throw new QueryError('Query could not be completed', error.message, {});
        }

        return {
          status: 'ok',
          data: result,
        };
      }
    }
  ```

9. Since it is a smiliar step for adding the logic for handling `query` operation, skipping it. 

10. Test files are generated by the cli when a plugin is created. You can use `jest` for writing the tests.

Tests for a specific plugin can be run using the command `tooljet plugin test --bigquery`

13. The plugin is now ready! 