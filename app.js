const express = require('express');
const url = require('url');
const fs = require('fs');
const path = require('path');
const qs = require('querystring');
const mysql = require('mysql');

const app = express();

const SITE_PORT = 80;
const TEMPLATE_FOLDER = 'templates'

var sql;

app.use(express.static(path.join(__dirname)));


fs.readFile(path.join(__dirname, 'password'), 'utf8', function(err, data) {
    if (err) {
        console.log("\n\nCANNOT RUN SERVER:\nNo password file for mysql located in root directory."
                + "\n Please create a file called \'password\' and write the mysql database password"
                + " inside the file");
        process.exit(1);
        console.log("\n" + err);
    }

    // Remove newline and carriage return from password
    data = data.replace(/[\n\r]+/g, '');

    // Connect, passing down password
    sql_connect(data);

});


function sql_connect(sql_password) {

    sql = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: sql_password,
        database: "db"// Database must be created first, otherwise this will crash
    });
    sql.connect(function(err) {
        if (err) throw err;
        console.log("Connected to MySQL!");

        sql.query('CREATE DATABASE IF NOT EXISTS db', function(err, result) {
            if (err) throw err;
            console.log("SQL Database created/checked");
        });

        // Match table
        sql.query('CREATE TABLE IF NOT EXISTS matches ('
                    + 'id INT PRIMARY KEY AUTO_INCREMENT,'
                    + 'team_number SMALLINT,'
                    + 'match_type VARCHAR(50),'
                    + 'match_number TINYINT UNSIGNED,'
                    + 'methodScoring VARCHAR(50),'
                    + 'methodAcquiring VARCHAR(50),'
                    + 'climbMech VARCHAR(50),'
                    + 'mobility VARCHAR(10),'
                    + 'autonSwitchCubes TINYINT UNSIGNED,'
                    + 'autonScaleCubes TINYINT UNSIGNED,'
                    + 'allianceSwitchCubes TINYINT UNSIGNED,'
                    + 'opposingSwitchCubes TINYINT UNSIGNED,'
                    + 'teleopScaleCubes TINYINT UNSIGNED,'
                    + 'exchange TINYINT UNSIGNED,'
                    + 'climb VARCHAR(50),'
                    + 'assistedOption VARCHAR(50)'
                    + ')'
                , function(err, result) {
            if (err) {
                throw err;
            }
        });

        // Team data table
        //sql.query('CREATE TABLE IF NOT EXISTS teams (team_number SMALLINT PRIMARY KEY)', function(err, result) {if (err) throw err;});
    });
}


const TINY_INT_LIST = ["match_number", "autonSwitchCubes", "autonScaleCubes", "allianceSwitchCubes", "opposingSwitchCubes", "teleopScaleCubes", "exchange"];


// Update scout data
app.post('/scout', function(req, res) {
    get_request_data(req, function(data) {
        console.log(data);

        //sql.query('SELECT 1 FROM matches m WHERE m.match_number=\'' + data.match_number + '\' AND m.team_number=\'' + data.team_number + '\'', function(err, result, fields) {
        sql.query('SELECT 1 FROM matches m WHERE m.match_number=? AND m.team_number=?', [data.match_number, data.team_number] , function(err, result, fields) {
            if (err) {
                throw err;
                return res.send({result: "error", error: err});
            }
            var abort = null;

        //making sure if data is valid
            Object.keys(data).forEach(function(element) {
                if (TINY_INT_LIST.indexOf(element) > -1) {
                    var intval = parseInt(data[element]);
                    console.log(intval);
                    if (intval > 255 || intval < 0) {
                        abort = {result: "invalid", error: "Invalid data for " + element + ": " + intval};
                        return;
                    }
                }
            });
        console.log("length:" + result.length + "abort: " + abort!=null);

          if (abort != null) {
              return res.send(abort);
          }

	        if (result.length == 0) {
              //if (result) <--?
              return res.send(sql_fast_insert('matches', data));
          } else {
                // TODO: Make this sql injection proof
                return res.send(sql_fast_update('matches', data, 'match_number=\'' + data.match_number + '\' AND team_number=\'' + data.team_number + '\''));
            }
            res.send({result: "success"});
        });
    });
});

app.post('/deleteall', function(req, res) {
    get_request_data(req, function(data) {
        if (data.verification === "diepotato") {
            sql_delete_all("matches");
            res.send({result: "success"});
        } else {
            res.send({result: "error"});
        }
    });
});

// Gets match data for particular match for particular team
app.get('/getdata', function(req, res) {
    var parts = url.parse(req.url, true);
    var data = parts.query;
    var match_number = data['match_number'];
    var team_number = data['team_number'];

    var queryExtraList = [];

    // Add our specifications to our query definier thing
    // if they exist of course
    if (match_number != null && (match_number !== "")) {
        queryExtraList.push("m.match_number=" + sql.escape(match_number));
    }
    if (team_number != null && (team_number !== "")) {
        queryExtraList.push("m.team_number=" + sql.escape(team_number));
    }

    // What to add to our sql check to specify our search
    var queryExtra = "";
    if (queryExtraList.length != 0) queryExtra = "WHERE ";
    queryExtra += queryExtraList.join(" AND ");

    // Yes, I know *wildcards* is bad practice. It's prototyping
    //sql.query('SELECT * FROM matches m WHERE m.match_number=\'' + match_number + '\' AND m.team_number=\'' + team_number + '\'', function(err, result, fields) {
    sql.query('SELECT * FROM matches m ' + queryExtra, function(err, result, fields) {
        if (err) throw err;
        res.send(result);
    });
});

// Get ALL team data from specific teams within a certain match or of a team number
// NOTE: This is NOT uni-wildcard-esque as getdata is.
//    as in, you cannot have both match_number and team_number arguments
//       (both can be empty to get all data though)
app.get('/getteamdata', function(req, res) {

    var parts = url.parse(req.url, true);
    var data = parts.query;
    var match_number = data['match_number'];
    var team_number = data['team_number'];

		var queryList = "";

		if (team_number != null && team_number !== "") {
				queryList = " WHERE m.team_number=" + sql.escape(team_number);
		}
		if (match_number != null && match_number !== "") {
				queryList = " WHERE m.match_number=" + sql.escape(match_number);
		}
		sql.query('SELECT distinct team_number FROM matches m' + queryList + ' ORDER BY match_number, team_number', function(err, result1, fields) {
				if (err) throw err;
				var data = [];
				var counter = 0;

				if (result1.length == 0) {
						res.send(data);
						return;
				}

				var query_recursive = function(err, result2, fields) {
						var element = result1[counter];

						console.log(element.team_number);
						data.push(result2);
						if (result1[counter + 1] === undefined) {
								res.send(data);
								return;
						}
						counter++;
						sql.query('SELECT * FROM matches m WHERE m.team_number=' + sql.escape(result1[counter].team_number), query_recursive);
				}
				sql.query('SELECT * FROM matches m WHERE m.team_number=' + sql.escape(result1[0].team_number), query_recursive);

		});
});

/*
app.get("*", function(req, res) {
    res.sendFile('index.html', {root: __dirname});
});
*/


app.get("/", function(req, res) {
    res.sendFile('index.html', {root: __dirname});
});

// START LISTENING
app.listen(SITE_PORT, '0.0.0.0' , function() {
    console.log('Listening on port ' + SITE_PORT);
});


/// UTILITY FUNCTIONS (todo: Put in a separate module)

// Loads a template, setting the html page as our current page
function load_template(url) {
    return path.join(__dirname + '/' + TEMPLATE_FOLDER + '/' + url);
}

// Gets the data from a request, passing it through the "on_complete" function
function get_request_data(req, on_complete) {
    var body = '';
    req.on('data', function(chunk) {
        body += chunk;
        if (body.length > 1e6) request.connection.destroy();
    });
    req.on('end', function() {
        var post = qs.parse(body);
        on_complete(post);
    });
}

// Deletes all data in a table. Obviously, be very careful with this
function sql_delete_all(table) {
    sql.query('DELETE FROM ' + table);
}

// Fast inserts data into an SQL table, creating a new row.
function sql_fast_insert(table, data) {
    var insert_titles = '(' + Object.keys(data).join(',') + ')';
    // Gotta include quotes
    var values = Object.keys(data).map((k) => sql.escape(data[k]));
    var value_titles = '(' + values.join(',') + ')';

    console.log('insert into matches ' + insert_titles + ' VALUES ' + value_titles);

    //sql.query('INSERT INTO ' + table + ' ' + insert_titles + ' VALUES ' + value_titles, function(err, result) {
    sql.query('INSERT INTO matches ' + insert_titles + ' VALUES ' + value_titles, function(err, result) {
        if (err) {
            return {result: "error", error: err};
            throw err;
        }
    });
}

// Fast updates data from an SQL table
function sql_fast_update(table, data, where_conditional) {
    var setters = '';
    for(var i = 0; i < Object.keys(data).length; i++) {
        var key = Object.keys(data)[i];
        var value = data[key];
        setters += key + "=" + sql.escape(value);
        if (i < Object.keys(data).length - 1) {
            setters += ',';
        }
        setters += ' ';
    }

    console.log("SETTERS: " + setters);

    //sql.query('UPDATE ' + table + ' SET ' + setters + ' ' + where_conditional, function(err, result) {
    sql.query('UPDATE matches SET ' + setters + ' WHERE ' + where_conditional,/* table,*/ function(err, result) {
        if (err) {
            return {result: "error", error: err};
            throw err;
        }
    });
}
