# Simple crawler application

Crawl webpages and time page loads.

## Usage

To install:

```
npm install https://github.com/ingfy/crawlr.git --save
```

To run from the command line:

```
node ./node_modules/crawlr -b http://www.example.com -i /ignore-subdir -i /images -o data.csv
```

Use as a library:

```
const crawrl = require('crawlr');

const instance = crawrl("http://www.example.com", {
	ignorePaths: ["/ignore-subdir/*", "/images/*"], 
	ignoreQuery: true
});

instance.stream.on('data', data => console.log(`Took ${data.time} to load ${data.url}`);
instance.stream.on('end', () => console.log('Finished!'));

setTimeout(() => instance.stop(), 2000);
```

## API

* `crawlr(baseUrl, [opts])`

	Initializes a new crawlr instance and crawls the given base URL, starting with the root.
	
	Example: `const instance = crawrl('https://www.example.com/');
	
	Options:
	
	- `ignorePaths`
	
		Ignore paths relative to the base URL that match the given patterns.
		
		Default: `[]`
		Example: `{ignorePaths: ['/ignore-this/*']}
		
	- `ingoreQuery`
	
		Skip query strings when crawling URLs, so don't visit the same page with different query strings.
		
		Default: `true`
		Example: `{ignoreQuery: false}`
