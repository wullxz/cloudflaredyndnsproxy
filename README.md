# Cloudflare DynDNS webproxy

I needed my router (AVM Fritzbox) to update my DynDNS record at cloudflare which is not possible out of the box because Fritzbox can only pass ip, hostname, username and password via GET-parameters.  
This is a daemon that you can run on a raspberry pi which will take the parameters via GET, acquire additional information from the cloudflare API (zoneid, zonename, domainid) and updates the given hostname with the given IP.

# Installation

```
git clone https://github.com/wullxz/cloudflaredyndnsproxy
cd cloudflaredyndnsproxy
sudo cp dyndns /etc/init.d/dyndns
sudo chown root:root /etc/init.d/dyndns
sudo chmod 755 /etc/init.d/dyndns
```

Now just change the `APP_PATH` variable near the top of `/etc/init.d/dyndns` to the path where the `app.js` is saved.  
Start the daemon with `sudo service dyndns start` then.

# Configure your DynDNS client

The webservice has to be called like this:  

`http://hostname:3000/dyndns/<domain>?email=<username>&ip=<ipaddr>&authkey=<pass>`

- <domain>: your DynDNS domain name that should be updated
- <username>: your cloudflare account email address
- <pass>: the auth key you can find in your account settings at cloudflare
- <ip>: the new IP address that should be assigned to <domain>
