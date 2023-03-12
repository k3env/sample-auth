# Sample JWT auth

[![Build Status](https://drone.k3env.site/api/badges/k3env/sample-auth/status.svg)](https://drone.k3env.site/k3env/sample-auth)
[![Version](https://img.shields.io/docker/v/k3env/sample-auth?style=flat)](https://hub.docker.com/r/k3env/sample-auth)

Sample JWT auth service

## Usage

### Configuration reference

| env variable | description                                 | type                    | required? | default value |
| ------------ | ------------------------------------------- | ----------------------- | --------- | ------------- |
| MONGO_URI    | MongoDB URI                                 | \*see notes below       | yes       | `not set`     |
| REDIS_URI    | Redis URI, not used                         | Redis connection URI    | no        | `not set`     |
| APP_KEY      | Symmetric key for HMAC signature generation | string                  | yes       | `not set`     |
| APP_HOST     | App listen address                          | IP address              | no        | `127.0.0.1`   |
| APP_PORT     | App listen port                             | Number in range 1-65535 | no        | `3000`        |
