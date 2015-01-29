#!/bin/sh

NODEJS_ROOT="null"

log () {
    printf "[info] $1\n"
}

error () {
    printf "[error] $1\n"
}

help () {
    printf "Usage: $0 [-h|--help] [-f|--force]\n"
    printf "  -h,--help   Shows this screen\n"
    printf "  -f,--force  Forces the download of a node.js instance\n"
    exit 1
}

install_nodejs () {
    ARCH="`uname -m`"
    PLATFORM="`uname`"
    NODEJS_URL="null"
    DOWNLOAD=0

    if [ "$1" = "1" ]; then
        DOWNLOAD=1
    fi
    
    if [ "$DOWNLOAD" = "0" ]; then
        log "Checking if node is installed..."
        node -v 2>&1 > /dev/null
        if [ "$?" = "0" ]; then
            log "node is found and working"
            log "Checking if npm is installed..."
            npm -v 2>&1 > /dev/null
            if [ "$?" = "0" ]; then
                log "npm is found and working"
                log "No need to install node.js"
                return 0
            fi
            log "Failed to detect npm"
        fi
    else
        log "Ignoring node/npm command check, downloading node.js"
    fi

    log "Detecting architecture and platform..."
    if [ $PLATFORM = "Darwin" ]; then
        if [ $ARCH = "x86_64" ]; then
            log "64-bit Mac OS X detected"
            NODEJS_URL="http://nodejs.org/dist/v0.10.35/node-v0.10.35-darwin-x64.tar.gz"
        elif [ $ARCH = "i686" ]; then
            log "32-bit Mac OS X detected"
            NODEJS_URL="http://nodejs.org/dist/v0.10.35/node-v0.10.35-darwin-x86.tar.gz"
        fi
    elif [ $PLATFORM = "Linux" ]; then
        if [ $ARCH = "x86_64" ]; then
            log "64-bit Linux detected"
            NODEJS_URL="http://nodejs.org/dist/v0.10.35/node-v0.10.35-linux-x64.tar.gz"
        elif [ $ARCH = "i686" ]; then
            log "32-bit Linux detected"
            NODEJS_URL="http://nodejs.org/dist/v0.10.35/node-v0.10.35-linux-x86.tar.gz"
        fi
    fi

    if [ $NODEJS_URL = "null" ]; then
        error "ERROR: Unsupported architecture: $PLATFORM $ARCH"
        exit -1
    fi

    FILENAME="`basename $NODEJS_URL`"
    BASENAME=${FILENAME%.tar.gz}
    
    if [ ! -d $BASENAME ]; then
        log "Cannot find $BASENAME directory in $PWD"
        DOWNLOAD=1
    fi
    
    if [ "$DOWNLOAD" = "1" ]; then
        log "Downloading node.js from $NODEJS_URL"
        curl $NODEJS_URL 2> /dev/null | tar zxf -
        log "Download complete, extracted into $PWD/$BASENAME"
    else
        log "Found node.js instance at $PWD/$BASENAME"
    fi
    
    NODEJS_ROOT=$PWD/$BASENAME

    return 1
}

if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    help
fi

log "Preparing to run TubeRTC..."

if [ "$1" = "--force" ] || [ "$1" = "-f" ]; then
    install_nodejs 1
else
    install_nodejs
fi

if [ "$?" = "1" ]; then
    log "Adding $NODEJS_ROOT/bin to PATH"
    PATH="$PATH:$NODEJS_ROOT/bin"
fi

log "Installing node.js dependencies for TubeRTC"
npm install
if [ ! "$?" = "0" ]; then
    error "Failed to resolve node.js dependencies!"
    exit 1
fi

log "Running TubeRTC"
npm start

sleep 2
if !(open "http://localhost:8080"); then
    if !(xdg-open "http://localhost:8080"); then
        if !(start "http://localhost:8080"); then
            log "TubeRTC running at http://localhost:8080"
        fi
    fi
fi
