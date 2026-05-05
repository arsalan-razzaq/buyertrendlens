# G2G Chat Helper

Semi-automatic Chrome extension for testing G2G seller chat flow.

What it does:

- loads seller IDs or full chat URLs into a queue
- opens the current seller chat
- auto-fills the preset message into the G2G editor
- moves to previous or next seller

What it does not do:

- it does not click `Send`
- it does not auto-message sellers

## Install

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select this folder: `chrome-g2g-helper`

## Usage

1. Open the extension popup.
2. Paste seller IDs or full URLs, one per line.
3. Add your preset message.
4. Click `Save Queue`.
5. Click `Open Current`.
6. The chat page opens and the message is auto-filled.
7. Review and send manually.
8. Click `Next` for the next seller.

## Supported input

IDs:

```text
875683
123456
987654
```

URLs:

```text
https://www.g2g.com/chat/#/user/875683
https://www.g2g.com/chat/#/user/123456
```
