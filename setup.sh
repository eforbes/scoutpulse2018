

# Install node
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
apt-get install -y nodejs

# Node modules
npm install express
npm install mysql

# Mysql
sudo apt-get install mysql-server

echo -e "\n\nOPENING MYSQL SHELL: \n Open with `$ mysql -u root -p`\n"
echo -e "CREATING DATABASES:\n `mysql> CREATE DATABASE db;`"

