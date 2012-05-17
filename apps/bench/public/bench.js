/**
 * KadOH Benchmarking.
 *
 * @param {Object} node - KadOH.node object on which execute  the benchmark
 * @param {[type]} options [description]
 */
KadOHBench = function(node, options) {
  EventEmitter.call(this);
  this.node = node;

  this.options = options;
  this.hops = options.hops || 4;
  this.idle = options.idle || 3 * 1000;

  // Benchmark sequences
  this.bench = [
    {
      name : 'join',
      fn   : 'join',
      cb   : 'addErrback'
    },
    {
      name   : 'unreached', 
      fn     : 'iterativeFindValue',
      cb     : 'addErrback',
      values : this.randomSeq(this.hops)
    },
    {
      name   : 'reached',
      fn     : 'iterativeFindValue',
      cb     : 'addCallback',
      values : this.seq(this.hops)
    }
  ];

  this.results = [];
};

// extends EventEmitter
for (var i in EventEmitter.prototype) { KadOHBench.prototype[i] = EventEmitter.prototype[i]; }

var SHA1 = KadOH.util.Crypto.digest.SHA1;

KadOHBench.prototype.start = function() {
  this.current = 0;
  this.startSequence(0);
};

KadOHBench.prototype.startSequence = function(n) {
  var seq = this.bench[n];
  if (!seq) {
    throw new Error('no sequence ' + n);
  }
  seq.values  = seq.values || [null];
  seq.current = 0;

  var self = this;
  seq.next = function() {
    seq.start = new Date().getTime();
    if (seq.current < seq.values.length) {
      self.collectResults(seq);
      self.node[seq.fn](seq.values[seq.current]);
    } else {
      self.nextSequence();
    }
  };

  seq.next();
};

KadOHBench.prototype.nextSequence = function() {
  var self = this;
  if (++this.current < this.bench.length) {
    setTimeout(function() {
      self.startSequence(self.current);
    }, this.idle);
  } else {
    this.emit('end', this.results);
  }
};

KadOHBench.prototype.collectResults = function(seq) {
  var self = this;
  this.node.once('iterativeFind started', function(lookup) {
    lookup[seq.cb](function() {
      self.results.push({
        type    : seq.name,
        time    : new Date().getTime() - seq.start,
        reached : lookup.Reached.size(),
        queries : lookup.Queried.size(),
        closest : lookup.Reached.size() > 0 ? lookup.Reached.getPeer(0).getDistanceTo(lookup._target) : -1
      });

      self.emit('data', self.results);
      seq.current++;
      seq.next();
    });
  });
};

//
// Utils
//

KadOHBench.prototype.seq = function(n) {
  var a = [];
  for (var i = 0; i < n; i++) { a.push(SHA1(i.toString())); }
  return a;
};

KadOHBench.prototype.randomSeq = function(n) {
  var a = [];
  for (var i = 0; i < n; i++) { a.push(SHA1(Math.random().toString())); }
  return a;
};

document.addEventListener("DOMContentLoaded", function() {
  KadOH.log.setLevel('info');
  var monitor  = document.getElementById("monitor");
  var cellular = document.getElementById("cellular");
  var start    = document.getElementById("start");
  var node = new KadOH.Node('b21108ffbbff076647a0ac0662acf4e4a5244b66', {
    bootstraps : [
      "bootstrap0@kadoh.fr.nf/kadoh",
      "bootstrap1@kadoh.fr.nf/kadoh",
      "bootstrap2@kadoh.fr.nf/kadoh"
    ],
    reactor : {
      transport : {
        jid      : 'kadoh@jabber.org',
        password : 'azerty',
        resource : 'kadoh'
      }
    }
  });
  KadOH.log.subscribeTo(node, 'Node', 'info');
  var bench = new KadOHBench(node, {
    hops : 5,
    idle : 2000
  });
  bench.on('data', function(results) {
    results = JSON.stringify(results, null, "\t");
    monitor.innerHTML = results;
  });
  bench.on('end', function(results) {
    // parse and sending
    var infos = {
      cellular : cellular.checked
    };

    results = results.map(function(r) {
      for (var i in infos) { r[i] = infos[i] }
      return r;
    });
    
    var json = JSON.stringify(results);
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "/results", true);
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    xmlhttp.send(json);
    xmlhttp.onreadystatechange = function() {
      if (xmlhttp.readyState == 4) {
        if (xmlhttp.status == 200) {
          monitor.innerHTML = "OK !\n\n" + monitor.innerHTML;
        }
      }
    }
    node.disconnect();
  });
  start.addEventListener("click", function() {
    monitor.innerHTML = "connecting...";
    node.connect(function() {
      monitor.innerHTML = "connected\n\nstarting the benchmark...";
      bench.start();
    });
    return false;
  });
});
