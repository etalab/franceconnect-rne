require('dotenv').config()

const {groupBy, deburr} = require('lodash')
const express = require('express')
const passport = require('passport')
const session = require('express-session')
const elus = require('./elus.json')
const fcStrategy = require('./lib/franceconnect/strategy')

const dateNaissanceIndex = groupBy(elus, 'dateNaissance')
const app = express()

function normalize(str) {
  return deburr(str).toUpperCase().replace(/[^A-Z]+/g, ' ')
}

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((user, done) => {
  done(null, user)
})

app.use(session({secret: 'foobar', saveUninitialized: false, resave: false}))
app.use(passport.initialize())
app.use(passport.session())

passport.use('franceconnect', fcStrategy)

app.get('/fc', passport.authenticate('franceconnect'))

app.get('/fc/callback', passport.authenticate('franceconnect', {failureRedirect: '/'}), (req, res) => {
  res.redirect('/')
})

app.get('/logout', (req, res) => {
  const {idToken} = req.user
  req.logout()
  res.redirect(`${process.env.FC_SERVICE_URL}/api/v1/logout?id_token_hint=${idToken}&state=foobar&post_logout_redirect_uri=${encodeURIComponent(process.env.ROOT_URL)}`)
})

app.get('/', (req, res) => {
  if (req.user) {
    const elu = findElu(req.user)
    if (!elu) {
      return res.send({message: 'Non trouvé dans le répertoire national des élus'})
    }

    return res.send(elu)
  }

  res.redirect('/fc')
})

function findElu({dateNaissance, nomNaissance, prenom, sexe}) {
  const nNomNaissance = normalize(nomNaissance)
  const nPrenom = normalize(prenom)
  return (dateNaissanceIndex[dateNaissance] || [])
    .find(c => c.sexe === sexe && normalize(c.nomNaissance) === nNomNaissance && normalize(c.prenom) === nPrenom)
}

app.listen(5000)
