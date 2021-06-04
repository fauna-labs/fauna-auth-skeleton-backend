# Fauna Auth skeleton

This repository contains unofficial patterns, sample code, or tools to help developers build more effectively with [Fauna][fauna]. All [Fauna Labs][fauna-labs] repositories are provided “as-is” and without support. By using this repository or its contents, you agree that this repository may never be officially supported and moved to the [Fauna organization][fauna-organization].

---



## What does it do?

This repository contains ideas and implementations for authentication with Fauna in the [client-serverless](https://fauna.com/client-serverless) scenario. Prior to the release of this skeleton, [Fauna Blueprints](https://github.com/fauna-labs/fauna-blueprints) were released which implement several aspects of  authentication. These blueprints contain the pure Fauna logic (in the form of [User Defined Functions](https://docs.fauna.com/fauna/current/api/graphql/functions))  and resources  in a format that can quickly be deployed with the [Fauna Schema Migrate](https://www.npmjs.com/package/@fauna-labs/fauna-schema-migrate) tool. Blueprints do not contain a frontend or backend since everyone has different preferences, to keep things understandable and easy to deploy, they only focus on Fauna. Of course, when it comes to authentication, many questions are answered in the frontend and backend. How do we wire everything up with a backend and frontend? What do we call from the frontend and what do we call from the backend? Where do we store tokens? This skeleton uses the blueprints and implements an example approach with a React frontend an NodeJS backend. You can use it to learn how to implement login, register, logout, refresh, silent refresh, email verification, email/password validation, password resets etc with Fauna. 

## Architecture

Most authentication calls flow from the frontend to the backend as in a regular three-tier application. This allows us to use httpOnly cookies to store refresh tokens and implement email verification logic. Some calls like password changes based on your old password (when you are logged in) or password changes based on a password reset token received by email can be done directly and therefore bypass the backend.  Once you are authenticated, the skeleton retrieved data directly from Fauna by using a short-lived access token. This allows us to get the best of both worlds, secure access yet faster (lower latency) access to our data and less strain on our backend. Regardless of whether calls flow through the backend, the bulk of the logic is implemented entirely in Fauna using the FQL language. 

![flows](https://user-images.githubusercontent.com/56540741/120808145-0c9f8f00-c549-11eb-82a5-a740d343a8e8.png)



If we simplify it we can perceive the way our application behaves as a state machine. We start off operating in three-tier modus where calls flow through the backend. Once the user is  authenticated, the client takes a more central role and directly interacts with Fauna via a short-lived access token. At the same time the client's access token is kept valid via silent refreshes. We could say that after authentication, we move to a  [client-serverless](https://fauna.com/client-serverless) modus. 

![state](https://user-images.githubusercontent.com/56540741/120808121-07dadb00-c549-11eb-81ea-0b104776ba58.png)

## Client-serverless

This pattern exemplifies how [client-serverless](https://fauna.com/client-serverless) is not necessarily an all-in but rather an extra tool in your belt. In some cases it makes a lot of sense to go through a backen , in other cases you can opt to skip the backend. When to bypass the backend and when not to is a question that might come up when applying this approach. For each Fauna access, ask yourself two things: 

- Are short-lived tokens (the lifetime is configurable) in frontend memory are acceptable for your security model?
- Will your backend  do nothing more than pass on the request?

If the answer to both questions is true, skipping the backend altogether for that specific call is an option. 

## Which blueprints are used in this skeleton? 

The following blueprints are used by dropping the resources into the fauna folder. Most of them are unmodified but some are slightly tailored towards the skeleton and configurable values were replaced by values which are stored in Fauna. 

- [Login / Register / Logout / Refresh (advanced)](https://github.com/fauna-labs/fauna-blueprints/tree/main/official/auth/refresh-tokens-advanced): 
- [Email verification](https://github.com/fauna-labs/fauna-blueprints/tree/main/official/auth/email-verification)

* [Password reset](https://github.com/fauna-labs/fauna-blueprints/tree/main/official/auth/password-reset)
* [Rate limiting](https://github.com/fauna-labs/fauna-blueprints/tree/main/official/rate-limiting)
* [Validation](https://github.com/fauna-labs/fauna-blueprints/tree/main/official/validation)
* [Logging](https://github.com/fauna-labs/fauna-blueprints/tree/main/community/logging)

## Setup:
### Npm install
There are three main folders:

* **backend**: contains a simple node express API as an example. 
* **frontend**: contains a simple example react application with login/register/reset forms and some dummy data.
* **fauna**: the fauna logic in a format that the [Fauna Schema Migrate]() tool can deploy.

Running ```npm install``` in the root folder should install all dependencies (including in the backend/frontend via postinstall), if something goes wrong,  run npm install in the backend and frontend separately as well. 

### Migrate

Grab a Fauna Admin key and export it 

``` export FAUNA_ADMIN_KEY=<your key>```

Or keep it at the ready to insert when the Fauna Schema Migrate tool asks for it.
Run the following command to apply all migrations.

```
npx fauna-schema-migrate apply all 
```

Or use the interactive tool and apply them one by one via ```npx fauna-schema-migrate run```

### Seed Data

To provide you with some data to explore the skeleton you can paste the following data in your fauna dashboard shell. 

1. Dinosaurs which serve as the data: 

```
Do(
  Create(Collection('dinos'), {
    data: {
      name: 'Skinny Dino',
      icon: 'skinny_dino.png',
      rarity: 'exotic'
    }
  }),
  Create(Collection('dinos'), {
    data: {
      name: 'Metal Dino',
      icon: 'metal_dino.png',
      rarity: 'common'
    }
  }),
  Create(Collection('dinos'), {
    data: {
      name: 'Flower Dino',
      icon: 'flower_dino.png',
      rarity: 'rare'
    }
  }),
  Create(Collection('dinos'), {
    data: {
      name: 'Grumpy Dino',
      icon: 'grumpy_dino.png',
      rarity: 'legendary'
    }
  }),
  Create(Collection('dinos'), {
    data: {
      name: 'Old Gentleman Dino',
      icon: 'old_gentleman_dino.png',
      rarity: 'legendary'
    }
  }),
  Create(Collection('dinos'), {
    data: {
      name: 'Old Lady Dino',
      icon: 'old_lady_dino.png',
      rarity: 'epic'
    }
  }),
  Create(Collection('dinos'), {
    data: {
      name: 'Sitting Dino',
      icon: 'sitting_dino.png',
      rarity: 'common'
    }
  }),
  Create(Collection('dinos'), {
    data: {
      name: 'Sleeping Dino',
      icon: 'sleeping_dino.png',
      rarity: 'uncommon'
    }
  })
)
```

2. Create two users. 

   * normal@test.com
   * admin@test.com

   with the same password: 'testtest'

```
Do(
  Create(Collection('accounts'), {
    data: {
      email: 'normal@test.com',
      type: 'normal',
      verified: true
    },
    credentials: {
      password: 'testtest'
    }
  }),
  Create(Collection('accounts'), {
    data: {
      email: 'admin@test.com',
      type: 'admin',
      verified: true
    },
    credentials: {
      password: 'testtest'
    }
  })
)
```

### Configure backend environment variables

The backend contains a .env.example file which you can copy. 

```
cp backend/.env.example backend/.env
```

The most important parts in there are the bootstrap key and session secret. 

- **BOOTSTRAP_KEY**=a Fauna key with the 'backend_role' role that will be available once you have loaded the schema with the FSM tool (see 'Migrate' chapter)
- **SESSION_SECRET**=a secret of your choice for your session cookies. 
- **SESSION_SECURE**=sets the session 'secure' flag on the cookie which ensures it is only send over HTTPS, read more about express cookies [here](https://expressjs.com/en/advanced/best-practice-security.html).

The other Fauna variables like domain and scheme are there in case you want to connect to another environment then the default Fauna production environment (e.g. preview or a local docker setup). Finally, to send emails we use Mailtrap. Mailtrap is a fake email sender which allows you to easily test email flows without going through the thorough verification steps that real email services require. 

You can find the Mailtrap credentials once you have a mailtrap.io account and created a mailtrap project in the SMTP settings of the project. If you prefer not to configure this, you can't get emails for verification or password resets but can still run the application.

### Configure frontend environment variables

The frontend has a similar example file. 

```
cp frontend/.env.example frontend/.env
```

It contains similar helper env variables in case you want to use a different Fauna environment and contains the ```REACT_APP_LOCAL___PUBLIC_BOOTSTRAP_KEY``` variable. Set this variable to a Fauna key with role 'frontend_public_role' which should also be available once you have loaded the schema with the FSM tool.  (see 'Migrate' chapter)

## Run

### Run backend 

```
npm run start_backend
```

### Run frontend

```
npm run start_frontend
```

![app](https://user-images.githubusercontent.com/56540741/120823458-be45bc80-c557-11eb-9d34-b4868937cc96.png)

And if everything goes right, you will be greeted by the two dinosaurs which can be accessed by the frontend key you have configured and can register/login to get access to more dinosaurs. 