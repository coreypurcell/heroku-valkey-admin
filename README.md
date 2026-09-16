# Heroku Valkey Admin

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://www.heroku.com/deploy?template=https://github.com/coreypurcell/heroku-valkey-admin)

Deploys [Valkey Admin](https://github.com/valkey-io/valkey-admin) behind HTTP Basic Authentication.

## Connect a Heroku Key-Value Store

Create the admin app with the button, then attach the Key-Value Store from the application that owns it:

```sh
heroku addons:attach source-app::REDIS --as REDIS -a customer-valkey-admin
```

The attached `REDIS_URL` automatically supplies the host, port, password, database, and TLS configuration. The wrapper disables certificate verification because Heroku Key-Value Store uses self-signed certificates.

Open the app and sign in with `ADMIN_USERNAME` and `ADMIN_PASSWORD` from the app's Config Vars. Change either value to rotate the Basic Auth credentials.

## Security

Valkey Admin has no built-in authentication or role-based access controls. This template protects the UI with one Basic Auth credential; every authenticated user can execute all commands permitted by the attached Key-Value Store credentials. Do not share the credentials with untrusted users.

## Maintenance

Dependabot checks the pinned `valkey/valkey-admin` Docker image weekly and opens one pull request for an upstream update after a seven-day cooldown. CI builds an AMD64 image and verifies authenticated access before the update is merged.

The wrapper uses the Node runtime already included in Valkey Admin's image. Its Node updates arrive with the reviewed upstream Valkey Admin image update; this repository has no separate Node image or npm dependencies to maintain.

Valkey Admin is licensed under [Apache-2.0](https://github.com/valkey-io/valkey-admin/blob/main/LICENSE).
