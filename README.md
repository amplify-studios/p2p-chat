# p2p-chat monorepo

## Structure

```
/p2p-chat
  /apps
    /web          # Next.js frontend
    /mobile       # React Native frontend
    /server       # signaling server
  /packages
    /core         # shared business logic (encryption, signaling utils, models)
```

> Each `apps/*` directory should contain its own `package.json` file with at least the dev, build and start scripts defined
