# p2p-chat

## Structure

```
/p2p-chat
  /apps
    /web          # Next.js frontend
    /server       # Signaling server
  /packages
    /core
    /crypto
    /sockets
    ...
```

> Each `apps/*` directory should contain its own `package.json` file with at least the dev, build and start scripts defined

## Turn the site into an application

1. Open it on a chromium-based browser (Chrome, Brave etc)
2. Press the options and look for the `Add to Home screen` button
3. This should create an application on your home screen

## Setup your own signaling server

```bash
$ curl -sSfL https://TODO | bash
 
$ cd p2p-chat-signaling
 
$ make start
```

## License

[CC BY-NC-SA 4.0](./LICENSE)
