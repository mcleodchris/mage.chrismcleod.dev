# Use an official Node.js runtime as the base image
FROM node:20-alpine

WORKDIR /usr/src/app
# create app user
RUN addgroup -S app -g 1001 && adduser -S app -u 600 -s /bin/bash -G app
# Create app directory and set it as the working directory
RUN chown -R app:app /usr/src/app
USER app

# Switch to the app user

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY --chown=app:app package*.json ./

# create temp and saved directories
RUN mkdir -p /usr/src/app/temp && chown -R app:app /usr/src/app/temp
RUN mkdir -p /usr/src/app/saved && chown -R app:app /usr/src/app/saved

# If you are building your code for production
RUN npm ci --only=production

# copy across only the app src folder
COPY --chown=app:app src src


# Expose the port the app runs in
EXPOSE 3000

# The command to run the application
CMD [ "npm", "start" ]