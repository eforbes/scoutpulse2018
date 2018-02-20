# scoutpulse

Welcome!

This is a project for Team 694's electronic scouting app.

## Official Site

Official site is accessable through [scout.stuypulse.com](https://scout.stuypulse.com)


## Deploying

Setup a mysql server, by installing mysql and creating the main database with a valid password


Create a file called `password` in the project root directory, and put your mysql database password inside of the file

Inside the project directory, simply run `node app.js`

To ensure the server continuously runs, install forever with `npm install forever` and run `forever start app.js`

Be sure to install any requied libraries with npm, should any
"missing library" compiler errors appear. They can all be found at the top of app.js

When you edit the table's column's you have to delete the database and create it again for
the changes to appear.

Helpful SQL commands:
 - USE <database_name>;
 - DROP database <database_name>;
 - SHOW TABLES;
 - To show everything in a table:
    - SELECT * from <table_name>;


