'use strict';

let cheerio = require('cheerio');
let request = require('request-promise');
	
function Crawler(baseUrl, ignorePaths, ignoreQuery) {
	this.baseUrl = baseUrl;
	this.ignorePaths = (ignorePaths || []).map(pattern => new RegExp(pattern));
	this.ignoreQuery = ignoreQuery || false;
	
	this.discovered = {};
	this.remaining = [];
}

Crawler.prototype.getDiscovered = function () {
	return Object.keys(discovered);
};

Crawler.prototype.enqueue = function (url) {
	this.discovered[url] = true;
	this.remaining.push(url);
};

Crawler.prototype.dequeue = function () {
	return this.remaining.pop();
};

Crawler.prototype.hasUnvisitedUrl = function () {
	return !!this.remaining.length;
};

Crawler.prototype.isNotIgnored = function (url) {
	var ignored = this.ignorePaths.find(re => re.test(url));
	return !ignored;
};

Crawler.prototype.isOnSameDomain = function (url) {
	return url.startsWith('/') && !url.startsWith('//');
};

Crawler.prototype.visitNextPage = function () {
	let next = this.dequeue();
	
	let startTime = new Date();
	
	return request({uri: this.baseUrl + next, headers: {'Accept': '*/*', 'User-Agent': 'curl/7.x'}})
		.then(doc => {
			let time = new Date() - startTime;
			
			let $ = cheerio.load(doc);
			
			let links = $('a')
				.map((i, e) => $(e).attr('href'))
				.get()
				.filter(url => this.isOnSameDomain(url))
				.filter(url => this.isNotIgnored(url));
			
			return {
				time: time,
				links: links
			};
		})
		.catch(err => {
			let time = new Date() - startTime;
			
			return {
				time: time,
				errorCode: err.statusCode
			};
		})
		.then(result => {
			if (result.links) {
				result.links.forEach(url => {
					if (this.ignoreQuery) url = url.replace(/\?.*/, '');
					if (!this.discovered[url]) this.enqueue(url);
				});
			}
			
			return {
				url: next,
				time: result.time,
				remaining: this.remaining.length,
				errorCode: result.errorCode
			};
		});
};

function crawl(baseUrl, opts) {
	opts = opts || {};
	opts.ignorePaths = opts.ignorePaths || [];
	opts.ignoreQuery = opts.ignoreQuery !== undefined ? opts.ignoreQuery : true;
	
	let EventEmitter = require('events');
	
	let crawler = new Crawler(baseUrl, opts.ignorePaths, opts.ignoreQuery);	
	
	let output = new EventEmitter();
	
	var stop = false;
	
	crawler.enqueue("/");
	
	function next() {
		if (!stop && crawler.hasUnvisitedUrl()) {
			crawler.visitNextPage().then(result => {
				output.emit('data', result);
				next();
			});
		} else {
			output.emit('end');
		}
	}
	
	next();
	
	return {stream: output, stop: () => {stop = true}};
}

function main() {
	let fs = require('fs');
	let argv = require('yargs')
		.demand('b')
		.alias('b', 'base-url')
		.nargs('b', 1)
		.describe('b', 'Base URL')
		.string('i')
		.alias('i', 'ignore-paths')
		.describe('i', 'Paths to ignore')
		.string('o')
		.alias('o', 'out-file')	
		.nargs('o', 1)
		.describe('o', 'Output results in CSV format to file')
		.boolean('q')
		.alias('q', 'differentiate-query')
		.describe('q', 'Interpret varying query string as different pages')
		.default('q', false)
		.example('$0 --base https://www.bergans.com --ignore /-/* --ignore /sitecore/* --out stats.csv')
		.help('h')
		.argv;
	
	if (argv.o) fs.writeFileSync(argv.o, 'URL,Load Time,Error Code\n');	
	var visited = 0;
		
	let crawler = crawl(argv.b, {
		ignorePaths: (typeof argv.i === 'string') ? [argv.i] : argv.i, 
		ignoreQuery: !argv.q
	});
	
	crawler.stream
		.on('data', result => {
			var logStr = `[${++visited}/${result.remaining}] Time: ${(result.time / 1000).toFixed(4)}s | ${result.url}`;
			if (result.errorCode) logStr += ` | Error Code: ${result.errorCode}`;
			console.log(logStr);
			if (argv.o) fs.writeFileSync(argv.o, `${result.url},${result.time},${result.errorCode || ''}\n`, {flag: 'a'})
		});	
}

if (require.main === module) {
    main();
}

module.exports = crawl;