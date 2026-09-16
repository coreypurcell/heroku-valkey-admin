# Heroku Valkey Admin

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://www.heroku.com/deploy?template=https://github.com/coreypurcell/heroku-valkey-admin)

Deploys [Valkey Admin](https://github.com/valkey-io/valkey-admin) behind HTTP Basic Authentication.

The button creates one `web` dyno. It does not create a Key-Value Store; attach the existing customer instance after deployment. Before using the button, generate a password and paste it into the required `ADMIN_PASSWORD` field:

```sh
openssl rand -hex 32
```

## Connect a Heroku Key-Value Store

Create the admin app with the button, then attach the Key-Value Store from the application that owns it:

```sh
heroku addons:attach source-app::REDIS --as REDIS -a customer-valkey-admin
```

The attached `REDIS_URL` automatically supplies the host, port, password, database, and TLS configuration, then opens the connection in Valkey Admin. The password remains inside the server and is never sent to the browser. The wrapper disables certificate verification because Heroku Key-Value Store uses self-signed certificates.

Open the app and sign in with `ADMIN_USERNAME` and `ADMIN_PASSWORD` from the app's Config Vars. Change either value to rotate the Basic Auth credentials. The app refuses to start if either value is empty.

## Deploy in a Private Space

Heroku Buttons cannot select a Private Space. Create the app in the target Cedar Private Space and deploy this repository instead:

```sh
git clone https://github.com/coreypurcell/heroku-valkey-admin.git
cd heroku-valkey-admin
heroku apps:create customer-valkey-admin --space customer-space --stack container
heroku config:set ADMIN_USERNAME=admin ADMIN_PASSWORD="$(openssl rand -hex 32)" -a customer-valkey-admin
heroku git:remote -a customer-valkey-admin
git push heroku main
heroku ps:scale web=1 -a customer-valkey-admin
```

Attach the customer's Key-Value Store after deployment. The admin app and the Key-Value Store must be in the same Private Space:

```sh
heroku addons:attach source-app::REDIS --as REDIS -a customer-valkey-admin
```

Use the Space's trusted IP ranges to limit browser access to approved corporate or VPN networks. Keep Basic Auth enabled; trusted IP ranges are network controls, not application authentication. Do not enable internal routing for this app unless users reach it through another app in the same Space or a peered/VPN-connected network.

## Security

Valkey Admin has no built-in authentication or role-based access controls. This template protects the UI with one Basic Auth credential; every authenticated user can execute all commands permitted by the attached Key-Value Store credentials. Do not share the credentials with untrusted users.

## Maintenance

Dependabot checks the pinned Valkey Admin source version weekly and opens one pull request for an upstream update after a seven-day cooldown. CI builds an AMD64 image and verifies authenticated access before the update is merged.

This template builds the pinned upstream source to add the runtime bootstrap endpoint required for `REDIS_URL` auto-connection. Review each Dependabot update because the small bootstrap patch must apply cleanly. Dependabot also tracks the Node image used for the build and runtime.

Valkey Admin is licensed under [Apache-2.0](https://github.com/valkey-io/valkey-admin/blob/main/LICENSE).
