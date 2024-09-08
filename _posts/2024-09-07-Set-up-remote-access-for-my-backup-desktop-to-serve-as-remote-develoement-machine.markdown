---
layout: post
title: "Set up remote access for my backup desktop to serve as remote development machine"
date: 2024-09-07 00:00:00 +0000
categories: computer_science
---

# Background

After configuring my new desktop, the previous one was suspended because of the electricity concern. But my friend told me his apartment was electric-free, after discussing with him I decided to move my previous desktop to his living room to set up a remote server to reduce the expence of cloud servers.


# Steps
## Step 1: clean the computer

This step was quiet simple, just download ubuntu 24.02 LTS image and install in the NVME SSD.

## Step 2: rent a VPS.

I have done some research and found the Digital Ocean has affordable VPS plan, besides, it has more user friendly UI. (compare to AWS and Azure, I still remember I spent tons of time to configure the lambda function with my friends on AWS.)

I picked nvme SSD plan with 1TB transfer, most of the time we use ssh do the connection, thus, that's enough for our use case.

Here is my referral links:
https://m.do.co/c/ac935f250670

## Step 3: use ssh reverse tunnel to create connection.


Firstly, we need to configure the vps. After setup a VPS in digital ocean we can setup a private public key pairs with instructions, here we call them DigitalOcean.pub/DigitalOcean. And all the network tools are pre-installed.

But we need to do some configuration for ssh.

```bash
sudo vim /etc/ssh/sshd_config
```
Ensure that "GatewayPorts yes" is enabled.



In the local ubuntu desktop, run:
```bash
ssh -R -i /path/to/your/private/key [VPS_port]:localhost:[local_port] [vps_user]@[vps_ip]
```
For example:
```bash
ssh -R -i /path/to/your/private/key 2222:localhost:22 [vps_user]@[vps_ip]
```
which forward local desktop ssh port 22 to the vps:2222.

Note: You can add -f -N to the ssh command to run it in the background without opening an interactive shell.

Done!

## Step4: connect to the VPS and use reverse channel to connect to the local server.

First, use any machine ssh to VPS:

```bash
ssh -i /path/to/your/private/key [vps_user]@[vps_ip]
```
And then type 
```bash
ssh [local_user]@localhost -p 2222
```

## Step5: write a auto-restart service

Create a systemd service file:

Open a new file for the service:

```bash

sudo nano /etc/systemd/system/reverse-ssh-tunnel.service
```

Edit the service file:

Add the following configuration to the file:


```bash
[Unit]
Description=Establish Reverse SSH Tunnel on Boot
After=network.target

[Service]
User=your_local_username
ExecStart=/usr/bin/ssh -i /path/to/your/private/key -N -R [VPS_port]:localhost:[local_port] [vps_user]@[vps_ip]
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target

```

- your_local_username: Your local machine's username.
- /path/to/your/private/key: The path to your SSH private key.
- [VPS_port]: The port on the VPS for the reverse tunnel (e.g., 2222).
- [local_port]: The port on the local machine to forward (e.g., 22).
- [vps_user]: Your VPS username.
- [vps_ip]: The IP address or domain of your VPS.


Reload the systemd daemon to recognize the new service:
```bash
sudo systemctl daemon-reload
# Enable the service to start at boot:
sudo systemctl enable reverse-ssh-tunnel.service
# Start the service manually to test:
sudo systemctl start reverse-ssh-tunnel.service
```

Verify and Troubleshoot
- Check the status of your service:

```bash
sudo systemctl status reverse-ssh-tunnel.service
```

If there are any errors, check the logs using:

```bash
sudo journalctl -u reverse-ssh-tunnel.service
```

- Persisting the SSH Connection
You might also want to set ClientAliveInterval and ServerAliveInterval in your SSH configuration to keep the tunnel alive during network disruptions.

On your VPS, edit /etc/ssh/sshd_config:

```bash
ClientAliveInterval 60
ClientAliveCountMax 2
```
On your local machine, you can add the following in your SSH command or /etc/ssh/ssh_config:

```bash
ServerAliveInterval 60
```
This ensures that the reverse SSH tunnel stays alive, even with temporary network issues.








