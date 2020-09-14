# Skeleton auth - backend-partial-extras
This repository contains ideas and implementations for the implementation of authentication with FaunaDB. 
Sicne there are many ideas and approaches, the repository is split up in multiple branches. 

* frontend-only: Authentication without a backend, arguably the least secure but it’ll get you started and might just be enough for simple applications (e.g., fully public sites like blogs and portfolios, or UI prototypes). Tokens will be stored in memory in the frontend.  
* frontend-only-extras: Extra ideas and implementations that extend upon the former branch. Placed in a separate branch in order not to distract from the core basics. We explain how to add public data or differentiate between data for different users, how we could block 3 faulty logins and explain a simple identity-based rate-limiting approach
* backend-partial: Authentication with a partial backend: this approach improves upon the previous approach by providing a lightweight backend that will solve a few inconveniences with storing tokens in memory (losing the session on refresh) and increases the security by storing refresh tokens in secure httpOnly cookies and storing short-lived tokens in memory. This approach is a happy and secure medium between frontend-only and full-blown backend. You only need a few serverless functions for your authentication 
* backend-partial-extras: Extra ideas and implementations that extend upon the former branch such as locking users on reuse of refresh tokens, adding access tokens to httpOnly cookies, email verification, and a password reset flow.

## Setup:
### Npm install in three folders + the root folder. 
There are three main folders:

* backend: contains a simple node express API as an example. 
* frontend: contains a simple example react application with login/register/reset forms and some dummy data.
* fauna-queries: all FaunaDB queries/functionality

Run ```npm install``` in the **root** folder as well as each of the three folders above. 

### Set up your project.
We have provided automatic scripts to set up everything for you. That means, create and destroy FaunaDB resources like Collections, Indexes, Roles, etc. 
To make them function, we have to give them access to our database. 

* Login (or sign up) to dashboard.fauna.com and create a new database.
* Go to the new database, click the Security tab on the left, Click 'NEW KEY' in the submenu that appeared and create a new administrator key.
* Copy the key, you will only see this key once. Be careful, it's a powerful key that gives full access to your database!

Go back to the root folder of the project and run:

```
npm run setup
```

The script will ask for an administrator key and take care of everything for you. Tip, in case you want to retry that or change code (e.g. changed FaunaDB Indexes). you can run this setup safely again and it will update the functions and roles. Indexes however, have to be recreated, therefore, there is also a ```npm run destroy```. Since FaunaDB caches role/function names, you will have to wait for 60 seconds before you run setup again. A workaround for development convenience is to place CHILD_DB_NAME=local in the fauna-queries/.env file which will tell the script to work with a child database which will be destroyed completely and recreated from scratch. 

### Optional Mailtrap setup 
Depending on the branch (e.g. email verification is only included in the backend-partial-extras branch and therefore is the only one that needs this)
Mailtrap is a fake email sender which allows you to easily test email flows. To set it up you need to provide the backend/.env file with two variables:
```
MAILTRAP_USERNAME=...
MAILTRAP_PASSWORD=...
```
You can find these credentials once you have a mailtrap.io account and created a mailtrap project in the SMTP settings of the project. 
If you prefer not to configure this, you can't get emails for verification or password resets but can still test the app with the default users (see below). 

## Run

### Run frontend
```
npm run start_frontend
```

### Run backend (not applicable to frontend-only branches)
```
npm run start_backend
```

## Default users
By default, the setup script has created two users for you. 

* normal@test.com
* admin@test.com

They both share the same password: 'testtest'
