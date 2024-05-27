# Use an official Node.js runtime as the base image
FROM node:20

WORKDIR /usr/src/app

COPY package*.json ./

# create temp and saved directories
RUN mkdir -p /usr/src/app/temp && chown -R node:node /usr/src/app/temp
RUN mkdir -p /usr/src/app/saved && chown -R node:node /usr/src/app/saved

# If you are building your code for production
RUN npm ci --only=production

# copy across only the app src folder
COPY src src

# Expose the port the app runs in
EXPOSE 3000

# The command to run the application
USER node
CMD [ "npm", "start" ]