# Instagram Media Grabber

A CLI tool for downloading media from Instagram accounts.

## Installation

```bash
npm install -g ins-grabber
```

## Usage

### Command Line

```bash
ins-grab download -c config.json
```

### Download from single account
```bash
ins-grab download -u username
```

### Download with specific media types
```bash
ins-grab download -u username -t image,video
```

### Download with config file
```bash
ins-grab download -c ./config.json
```

### Show help
```bash
ins-grab download --help
```

### Configuration File

```json
{
  "accounts": [
    {
      "username": "example_account",
      "lastFetch": null,
      "maxItems": 100,
      "mediaTypes": ["image", "video"]
    }
  ],
  "fetchInterval": "1d"
}
```

## Options

- `-c, --config`: Path to config file
- `-u, --username`: Single account username
- `-t, --types`: Media types to download (image,video)
- `-m, --max-items`: Maximum items to download
- `-p, --proxy`: Proxy URL
- `--timeout`: Request timeout in milliseconds

